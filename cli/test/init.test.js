const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..", "..");
const bin = path.join(root, "cli", "bin", "starwork.js");
const packageJson = require(path.join(root, "package.json"));

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "starwork-init-test-"));
}

function runInit(args) {
  return execFileSync(process.execPath, [bin, "init", ...args], {
    cwd: root,
    encoding: "utf8"
  });
}

function runDoctor(args) {
  return spawnSync(process.execPath, [bin, "doctor", ...args], {
    cwd: root,
    encoding: "utf8"
  });
}

function runCommand(args, options = {}) {
  return spawnSync(process.execPath, [bin, ...args], {
    cwd: root,
    env: {
      ...process.env,
      ...(options.env || {})
    },
    encoding: "utf8"
  });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...listFiles(entryPath));
    } else {
      result.push(entryPath);
    }
  }
  return result;
}

function fakeCodexBin({ exitCode = 0, stderr = "", inputPath, failTurnStart = false, omitFinalRead = false, omitTurnCompleted = false } = {}) {
  const dir = tempDir();
  const binDir = path.join(dir, "bin");
  fs.mkdirSync(binDir, { recursive: true });
  const codex = path.join(binDir, "codex");
  fs.writeFileSync(codex, `#!/usr/bin/env node
const fs = require("fs");
const readline = require("readline");
if (${JSON.stringify(stderr)}) process.stderr.write(${JSON.stringify(stderr)});
if (${exitCode} !== 0) {
  process.exit(${exitCode});
}
const rl = readline.createInterface({ input: process.stdin });
rl.on("line", (line) => {
  if (process.env.STARWORK_FAKE_CODEX_INPUT) {
    fs.appendFileSync(process.env.STARWORK_FAKE_CODEX_INPUT, line + "\\n");
  }
  const request = JSON.parse(line);
  if (request.method === "thread/read") {
    if (${Boolean(omitFinalRead)} && request.id >= 4) return;
    console.log(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: { thread: { id: request.params.threadId, name: "Fake Codex Thread", cwd: "/fake/project", status: "idle", turns: [{ id: "turn-1", status: "completed" }, { id: "turn-2", status: "completed" }] } } }));
  } else if (request.method === "thread/start") {
    console.log(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: { threadId: "launched-thread-1" } }));
  } else if (request.method === "thread/list") {
    console.log(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: { data: [{ id: "dev-thread-2", name: "Fake Codex Thread" }] } }));
  } else if (request.method === "turn/start") {
    if (${Boolean(failTurnStart)}) {
      console.log(JSON.stringify({ jsonrpc: "2.0", id: request.id, error: { message: "turn start failed" } }));
      return;
    }
    console.log(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: { turnId: "turn-started-1" } }));
    console.log(JSON.stringify({ jsonrpc: "2.0", method: "turn/started", params: { turnId: "turn-started-1" } }));
    if (!${Boolean(omitTurnCompleted)}) {
      console.log(JSON.stringify({ jsonrpc: "2.0", method: "turn/completed", params: { turnId: "turn-started-1" } }));
    }
  } else {
    console.log(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: {} }));
  }
});
`, "utf8");
  fs.chmodSync(codex, 0o755);
  return {
    env: {
      PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
      ...(inputPath ? { STARWORK_FAKE_CODEX_INPUT: inputPath } : {})
    }
  };
}

test("prints version and product-oriented help", () => {
  const version = runCommand(["--version"]);
  assert.equal(version.status, 0);
  assert.equal(version.stdout.trim(), packageJson.version);

  const help = runCommand(["--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, new RegExp(`StarWork CLI ${packageJson.version}`));
  assert.match(help.stdout, /常用开始/);
  assert.match(help.stdout, /starwork init --help/);
});

test("dry-run does not write files", () => {
  const dir = tempDir();
  const output = runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--dry-run"]);

  assert.match(output, /创建工作台预览/);
  assert.match(output, new RegExp(`目标目录：${dir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.match(output, /是否新建目录：否，目标目录已存在/);
  assert.match(output, /日常工作会放在：输出\/草稿\//);
  assert.equal(fs.existsSync(path.join(dir, "AGENTS.md")), false);
  assert.equal(fs.existsSync(path.join(dir, ".starwork", "workspace.json")), false);
});

test("init dry-run shows absolute target for a new folder", () => {
  const parent = tempDir();
  const target = path.join(parent, "review-workspace");
  const output = runInit(["--type", "project", "--pack", "general", "--target", target, "--dry-run"]);

  assert.match(output, new RegExp(`目标目录：${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.match(output, /是否新建目录：是/);
  assert.equal(fs.existsSync(target), false);
});

test("init dry-run uses the user-confirmed target instead of a suggested folder name", () => {
  const parent = tempDir();
  const target = path.join(parent, "my-reviewed-name");
  const output = runInit(["--type", "project", "--pack", "general", "--name", "产品发布计划", "--target", target, "--dry-run"]);

  assert.match(output, new RegExp(`目标目录：${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.doesNotMatch(output, /product-launch-plan/);
  assert.equal(fs.existsSync(target), false);
});

test("init dry-run shows selected language", () => {
  const dir = tempDir();
  const output = runInit(["--type", "single-light", "--pack", "general", "--language", "en", "--target", dir, "--dry-run"]);

  assert.match(output, /语言：英文/);
  assert.equal(fs.existsSync(path.join(dir, ".starwork", "workspace.json")), false);
});

test("init rejects unsupported language", () => {
  const dir = tempDir();
  const result = runCommand(["init", "--type", "single-light", "--pack", "general", "--language", "fr", "--target", dir, "--dry-run"]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /不支持的语言：fr/);
});

test("creates a single-light workspace with general pack", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);

  const state = readJson(path.join(dir, ".starwork", "workspace.json"));
  const skills = readJson(path.join(dir, ".starwork", "skills.json"));
  const agents = fs.readFileSync(path.join(dir, "AGENTS.md"), "utf8");
  const identity = fs.readFileSync(path.join(dir, "_系统", "身份", "README.md"), "utf8");
  const lessons = fs.readFileSync(path.join(dir, "_系统", "教训", "README.md"), "utf8");
  const projectStatus = fs.readFileSync(path.join(dir, "_系统", "上下文", "当前项目.md"), "utf8");
  const currentWork = fs.readFileSync(path.join(dir, "_系统", "任务", "当前工作.md"), "utf8");
  assert.equal(state.workspace_type, "project");
  assert.equal(state.kit, "project");
  assert.equal(state.packs[0].id, "general");
  assert.equal(skills.skills[0].id, "neat-freak");
  assert.equal(skills.skills[0].source.kind, "kit");
  assert.equal(fs.existsSync(path.join(dir, ".agents", "skills", "neat-freak", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(dir, "AGENTS.md")), true);
  assert.equal(fs.existsSync(path.join(dir, "输出", "确认成果", "README.md")), true);
  assert.equal(fs.existsSync(path.join(dir, "_系统", "身份", "README.md")), true);
  assert.equal(fs.existsSync(path.join(dir, "_系统", "教训", "README.md")), true);
  assert.equal(fs.existsSync(path.join(dir, "知识")), false);
  assert.equal(fs.existsSync(path.join(dir, "知识库")), false);
  assert.equal(fs.existsSync(path.join(dir, "_系统", "主库同步")), false);
  assert.equal(fs.existsSync(path.join(dir, ".core-sync.json")), false);
  assert.equal(fs.existsSync(path.join(dir, ".internal")), false);
  assert.match(agents, /相关时再读/);
  assert.match(agents, /_系统\/身份\/README\.md/);
  assert.match(agents, /_系统\/教训\/README\.md/);
  assert.doesNotMatch(agents, /Folders Not Used|Initialized as|blueprint|dry-run/);
  assert.match(identity, /长期背景/);
  assert.match(identity, /沟通偏好/);
  assert.match(identity, /稳定约束/);
  assert.doesNotMatch(identity, /主库分发|初始化快照|Hub identity|satellite/i);
  assert.match(lessons, /已确认教训/);
  assert.match(lessons, /候选教训/);
  assert.match(projectStatus, /## 目标/);
  assert.match(projectStatus, /## 当前阶段/);
  assert.match(projectStatus, /## 近期重点/);
  assert.match(projectStatus, /## 主要事实源/);
  assert.match(projectStatus, /## 风险/);
  assert.doesNotMatch(projectStatus, /Initialized as|StarWork project workspace|blueprint|Folders Not Used|doctor/);
  assert.match(currentWork, /## 现在/);
  assert.match(currentWork, /## 给下一个 AI 的备注/);
});

test("creates an English project workspace with standalone system templates", () => {
  const dir = tempDir();
  runInit(["--type", "project", "--pack", "general", "--language", "en", "--target", dir, "--yes"]);

  const agents = fs.readFileSync(path.join(dir, "AGENTS.md"), "utf8");
  const identity = fs.readFileSync(path.join(dir, "_system", "identity", "README.md"), "utf8");
  const lessons = fs.readFileSync(path.join(dir, "_system", "lessons", "README.md"), "utf8");
  const projectStatus = fs.readFileSync(path.join(dir, "_system", "context", "current-project.md"), "utf8");
  const currentWork = fs.readFileSync(path.join(dir, "_system", "tasks", "current-work.md"), "utf8");
  const doctor = runDoctor(["--target", dir, "--json"]);
  const report = JSON.parse(doctor.stdout);

  assert.equal(fs.existsSync(path.join(dir, "_system", "main-repo-sync")), false);
  assert.equal(fs.existsSync(path.join(dir, "knowledge")), false);
  assert.equal(fs.existsSync(path.join(dir, "knowledge-base")), false);
  assert.equal(fs.existsSync(path.join(dir, ".core-sync.json")), false);
  assert.equal(fs.existsSync(path.join(dir, ".internal")), false);
  assert.match(agents, /Read When Relevant/);
  assert.match(agents, /_system\/identity\/README\.md/);
  assert.match(agents, /_system\/lessons\/README\.md/);
  assert.doesNotMatch(agents, /Folders Not Used|Initialized as|blueprint|dry-run/);
  assert.match(identity, /Durable Context/);
  assert.match(identity, /Communication Preferences/);
  assert.match(identity, /Stable Constraints/);
  assert.doesNotMatch(identity, /Hub identity snapshot|main repo|synced main-repository|satellite/i);
  assert.match(lessons, /Active Lessons/);
  assert.match(lessons, /Candidate Lessons/);
  assert.match(lessons, /How To Add A Lesson/);
  assert.match(projectStatus, /## Goal/);
  assert.match(projectStatus, /## Current Stage/);
  assert.match(projectStatus, /## Focus/);
  assert.match(projectStatus, /## Primary Sources/);
  assert.match(projectStatus, /## Risks/);
  assert.match(projectStatus, /## Next Step/);
  assert.doesNotMatch(projectStatus, /Initialized as|StarWork project workspace|blueprint|Folders Not Used|doctor/);
  assert.match(currentWork, /## Now/);
  assert.match(currentWork, /## Notes For Next AI/);
  assert.equal(doctor.status, 0);
  assert.equal(report.ok, true);
});

test("knowledge init creates an optional local project knowledge base", () => {
  const dir = tempDir();
  runInit(["--type", "project", "--pack", "general", "--target", dir, "--yes"]);

  const preview = runCommand(["knowledge", "init", "--target", dir, "--dry-run"]);
  assert.equal(preview.status, 0);
  assert.match(preview.stdout, /知识库\/schema\.md/);
  assert.match(preview.stdout, /starworkKnowledgeProject\/SKILL\.md/);
  assert.equal(fs.existsSync(path.join(dir, "知识库")), false);

  const result = runCommand(["knowledge", "init", "--target", dir, "--yes"]);
  const state = readJson(path.join(dir, ".starwork", "workspace.json"));
  const status = runCommand(["knowledge", "status", "--target", dir, "--json"]);
  const report = JSON.parse(status.stdout);
  const doctor = runDoctor(["--target", dir, "--json"]);
  const doctorReport = JSON.parse(doctor.stdout);

  assert.equal(result.status, 0);
  assert.equal(state.capabilities.knowledge.enabled, true);
  assert.equal(state.capabilities.knowledge.root, "知识库");
  assert.equal(state.capabilities.knowledge.language, "zh");
  assert.equal(state.capabilities.knowledge.version, "0.1");
  assert.deepEqual(state.capabilities.knowledge.project_skill_ids, ["starworkKnowledgeProject"]);
  assert.equal(fs.existsSync(path.join(dir, "知识库", "README.md")), true);
  assert.equal(fs.existsSync(path.join(dir, "知识库", "index.md")), true);
  assert.equal(fs.existsSync(path.join(dir, "知识库", "schema.md")), true);
  assert.equal(fs.existsSync(path.join(dir, "知识库", "log.md")), true);
  assert.equal(fs.existsSync(path.join(dir, "知识库", "pages")), true);
  assert.equal(fs.existsSync(path.join(dir, "知识库", "synthesis")), true);
  assert.match(fs.readFileSync(path.join(dir, "知识库", "schema.md"), "utf8"), /`pages\/` 写作规则/);
  assert.match(fs.readFileSync(path.join(dir, "知识库", "schema.md"), "utf8"), /`synthesis\/` 写作规则/);
  assert.equal(fs.existsSync(path.join(dir, ".agents", "skills", "starworkKnowledgeProject", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(dir, ".claude", "skills", "starworkKnowledgeProject", "SKILL.md")), true);
  const skills = readJson(path.join(dir, ".starwork", "skills.json"));
  assert.equal(skills.skills.some((skill) => skill.id === "starworkKnowledgeProject"), true);
  assert.equal(status.status, 0);
  assert.equal(report.enabled, true);
  assert.equal(report.root, "知识库");
  assert.equal(report.skills.project_skill_installed, true);
  assert.deepEqual(report.skills.project_skill_ids, ["starworkKnowledgeProject"]);
  assert.equal(Object.hasOwn(report, "next_steps"), false);
  assert.equal(doctor.status, 0);
  assert.equal(doctorReport.knowledge.enabled, true);
});

test("knowledge init is idempotent and preserves user-edited knowledge files", () => {
  const dir = tempDir();
  runInit(["--type", "project", "--pack", "general", "--target", dir, "--yes"]);

  const first = runCommand(["knowledge", "init", "--target", dir, "--yes"]);
  assert.equal(first.status, 0);
  fs.writeFileSync(path.join(dir, "知识库", "schema.md"), "# Custom Schema\n", "utf8");
  const second = runCommand(["knowledge", "init", "--target", dir, "--yes"]);
  const check = runCommand(["knowledge", "check", "--target", dir, "--json"]);
  const report = JSON.parse(check.stdout);
  const noisyFiles = listFiles(dir).filter((file) => file.includes(".starwork-new"));

  assert.equal(second.status, 0);
  assert.deepEqual(noisyFiles, []);
  assert.equal(fs.readFileSync(path.join(dir, "知识库", "schema.md"), "utf8"), "# Custom Schema\n");
  assert.equal(report.ok, true);
  assert.equal(report.skills.project_skill_installed, true);
});

test("knowledge status reports facts only when the capability is not enabled", () => {
  const dir = tempDir();
  runInit(["--type", "project", "--pack", "general", "--target", dir, "--yes"]);

  const status = runCommand(["knowledge", "status", "--target", dir, "--json"]);
  const report = JSON.parse(status.stdout);
  const check = runCommand(["knowledge", "check", "--target", dir]);
  const doctor = runDoctor(["--target", dir, "--json"]);

  assert.equal(status.status, 0);
  assert.equal(report.enabled, false);
  assert.equal(report.exists, false);
  assert.equal(report.skills.project_skill_installed, false);
  assert.equal(Object.hasOwn(report, "next_steps"), false);
  assert.equal(check.status, 0);
  assert.match(check.stdout, /还没有开启知识库/);
  assert.equal(doctor.status, 0);
});

test("init --knowledge creates the English knowledge-base structure", () => {
  const dir = tempDir();
  runInit(["--type", "project", "--pack", "general", "--language", "en", "--target", dir, "--knowledge", "--yes"]);

  const state = readJson(path.join(dir, ".starwork", "workspace.json"));
  const status = runCommand(["knowledge", "status", "--target", dir, "--json"]);
  const report = JSON.parse(status.stdout);

  assert.equal(state.capabilities.knowledge.enabled, true);
  assert.equal(state.capabilities.knowledge.root, "knowledge-base");
  assert.equal(state.capabilities.knowledge.language, "en");
  assert.deepEqual(state.capabilities.knowledge.project_skill_ids, ["starworkKnowledgeProject"]);
  assert.equal(fs.existsSync(path.join(dir, "knowledge-base", "schema.md")), true);
  assert.equal(fs.existsSync(path.join(dir, ".agents", "skills", "starworkKnowledgeProject", "SKILL.md")), true);
  assert.match(fs.readFileSync(path.join(dir, "knowledge-base", "README.md"), "utf8"), /Project Knowledge Base/);
  assert.equal(report.enabled, true);
  assert.equal(report.root, "knowledge-base");
  assert.equal(Object.hasOwn(report, "next_steps"), false);
});

test("knowledge apply creates structure from a blueprint without moving legacy knowledge", () => {
  const dir = tempDir();
  const blueprintDir = tempDir();
  const blueprintPath = path.join(blueprintDir, "knowledge-blueprint.json");
  runInit(["--type", "project", "--pack", "general", "--target", dir, "--yes"]);
  fs.mkdirSync(path.join(dir, "知识"), { recursive: true });
  fs.writeFileSync(path.join(dir, "知识", "old.md"), "# old\n", "utf8");
  fs.writeFileSync(blueprintPath, JSON.stringify({
    version: "0.1",
    type: "starwork.knowledge",
    language: "zh",
    root: "知识库",
    actions: [
      { type: "create_knowledge_base", path: "知识库" },
      { type: "append_agents_rule", path: "AGENTS.md", section: "知识库" },
      { type: "install_project_skill" },
      { type: "copy_preserved_file", from: "知识/old.md", to: "知识库/inbox/old.md", confirmed: true },
      { type: "record_workspace_capability" }
    ],
    preserve: ["知识/"]
  }, null, 2), "utf8");

  const result = runCommand(["knowledge", "apply", "--target", dir, "--blueprint", blueprintPath, "--yes"]);
  const state = readJson(path.join(dir, ".starwork", "workspace.json"));
  const status = runCommand(["knowledge", "status", "--target", dir, "--json"]);
  const report = JSON.parse(status.stdout);

  assert.equal(result.status, 0);
  assert.equal(state.capabilities.knowledge.root, "知识库");
  assert.equal(fs.existsSync(path.join(dir, "知识库", "schema.md")), true);
  assert.equal(fs.existsSync(path.join(dir, "知识", "old.md")), true);
  assert.equal(fs.existsSync(path.join(dir, "知识库", "inbox", "old.md")), true);
  assert.equal(fs.existsSync(path.join(dir, ".agents", "skills", "starworkKnowledgeProject", "SKILL.md")), true);
  assert.deepEqual(report.legacy_candidates, ["知识"]);
});

test("knowledge blueprint rejects unsafe actions", () => {
  const dir = tempDir();
  const blueprintDir = tempDir();
  const blueprintPath = path.join(blueprintDir, "knowledge-blueprint.json");
  runInit(["--type", "project", "--pack", "general", "--target", dir, "--yes"]);
  fs.writeFileSync(blueprintPath, JSON.stringify({
    version: "0.1",
    type: "starwork.knowledge",
    language: "zh",
    root: "知识库",
    actions: [
      { type: "promote_to_project_center", path: "知识库" }
    ]
  }, null, 2), "utf8");

  const result = runCommand(["knowledge", "apply", "--target", dir, "--blueprint", blueprintPath, "--yes"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /不允许 action\.type：promote_to_project_center/);
});

test("init creates a customized workspace from a blueprint", () => {
  const dir = tempDir();
  const blueprintDir = tempDir();
  fs.mkdirSync(path.join(blueprintDir, "rules"), { recursive: true });
  fs.writeFileSync(path.join(blueprintDir, "rules", "file-boundaries.md"), "代码放在 {{paths.drafts}}，产品文档放在 {{paths.final}}。\n", "utf8");
  fs.writeFileSync(path.join(blueprintDir, "rules", "workflow.md"), "推进时先读 docs/，再改 src/。\n", "utf8");
  fs.writeFileSync(path.join(blueprintDir, "init-blueprint.json"), `${JSON.stringify({
    schema: "starwork.init_blueprint.v0.1",
    name: "AI Discussion",
    workspace_type: "project",
    kit: "project",
    language: "en",
    pack: "general",
    paths: {
      formal_source: "docs/",
      business_work_area: "src/"
    },
    directories: [
      {
        path: "src/",
        purpose: "存放代码和 AI 工作稿",
        write_policy: "writable"
      },
      {
        path: "docs/",
        purpose: "存放用户确认后的产品文档",
        write_policy: "confirm_before_write"
      }
    ],
    folders: ["src/", "docs/"],
    removals: ["references/", "outputs/", "参考资料/", "输出/"],
    agent_rules: [
      {
        slot: "workspace.file_boundaries",
        from: "rules/file-boundaries.md"
      },
      {
        slot: "workspace.workflow",
        from: "rules/workflow.md"
      }
    ]
  }, null, 2)}\n`, "utf8");

  const preview = runInit(["--target", dir, "--blueprint", path.join(blueprintDir, "init-blueprint.json"), "--dry-run"]);
  assert.match(preview, /初始化定制单/);
  assert.match(preview, /日常工作会放在：src\//);
  assert.equal(fs.existsSync(path.join(dir, "src")), false);

  runInit(["--target", dir, "--blueprint", path.join(blueprintDir, "init-blueprint.json"), "--yes"]);

  const state = readJson(path.join(dir, ".starwork", "workspace.json"));
  assert.equal(state.created_by, "starwork init --blueprint");
  assert.equal(state.language, "en");
  assert.equal(state.paths.formal_source, "docs/");
  assert.equal(state.paths.business_work_area, "src/");
  assert.equal(state.customization.type, "init_blueprint");
  assert.deepEqual(state.packs[0].paths, {
    references: "src/",
    drafts: "src/",
    final: "docs/"
  });
  assert.equal(fs.existsSync(path.join(dir, "src")), true);
  assert.equal(fs.existsSync(path.join(dir, "docs")), true);
  assert.equal(fs.existsSync(path.join(dir, "references")), false);
  assert.equal(fs.existsSync(path.join(dir, "outputs")), false);
  assert.equal(fs.existsSync(path.join(dir, "参考资料")), false);
  assert.equal(fs.existsSync(path.join(dir, "输出")), false);
  assert.match(fs.readFileSync(path.join(dir, ".starwork", "rules", "workspace.file_boundaries.md"), "utf8"), /代码放在 src\//);
  const agents = fs.readFileSync(path.join(dir, "AGENTS.md"), "utf8");
  assert.match(agents, /Workspace Directories/);
  assert.match(agents, /`src\/` \| 存放代码和 AI 工作稿/);
  assert.match(agents, /`docs\/` \| 存放用户确认后的产品文档/);
  assert.doesNotMatch(agents, /references\/|outputs\/|参考资料|输出\/草稿|Folders Not Used|Initialized as|blueprint|dry-run/);
  assert.doesNotMatch(fs.readFileSync(path.join(dir, "_system", "context", "current-project.md"), "utf8"), /Initialized as|StarWork project workspace|blueprint|Folders Not Used|doctor/);

  const report = runDoctor(["--target", dir, "--json"]);
  assert.equal(report.status, 0);
  const parsed = JSON.parse(report.stdout);
  assert.equal(parsed.ok, true);
  assert(parsed.checks.some((check) => check.id === "blueprint.schema" && check.level === "pass"));
});

test("init blueprint cannot remove StarWork mechanism files", () => {
  const dir = tempDir();
  const blueprintDir = tempDir();
  fs.writeFileSync(path.join(blueprintDir, "init-blueprint.json"), `${JSON.stringify({
    schema: "starwork.init_blueprint.v0.1",
    name: "Unsafe Init",
    workspace_type: "project",
    kit: "project",
    language: "zh",
    pack: "general",
    removals: [".starwork/"]
  }, null, 2)}\n`, "utf8");

  const result = runCommand(["init", "--target", dir, "--blueprint", path.join(blueprintDir, "init-blueprint.json"), "--dry-run"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /不能跳过 StarWork 机制文件/);
});

test("creates a project workspace with content creator pack", () => {
  const dir = tempDir();
  runInit(["--type", "project", "--pack", "content-creator", "--target", dir, "--yes"]);

  const state = readJson(path.join(dir, ".starwork", "workspace.json"));
  const agents = fs.readFileSync(path.join(dir, "AGENTS.md"), "utf8");
  const packRule = fs.readFileSync(path.join(dir, ".starwork", "rules", "pack.content-creator.overview.md"), "utf8");
  assert.equal(state.workspace_type, "project");
  assert.equal(state.packs[0].id, "content-creator");
  assert.equal(state.paths.formal_source, "发布记录/");
  assert.match(agents, /\.starwork\/rules\/index\.md/);
  assert.doesNotMatch(agents, /StarWork Rule Slot:/);
  assert.match(packRule, /自媒体内容创作场景/);
  assert.equal(fs.existsSync(path.join(dir, "事项", "注册表.md")), false);
  assert.equal(fs.existsSync(path.join(dir, "发布记录", "README.md")), true);
  assert.equal(fs.existsSync(path.join(dir, ".starwork", "packs", "content-creator", "templates", "content-brief.md")), true);
});

test("init rejects removed matter workspace type", () => {
  const dir = tempDir();
  const result = runCommand(["init", "--type", "single-matter", "--target", dir, "--yes"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /不支持的工作区类型：single-matter/);
});

test("creates a hub workspace with hub management pack", () => {
  const dir = tempDir();
  const output = runInit(["--type", "hub", "--target", dir, "--yes"]);

  const state = readJson(path.join(dir, ".starwork", "workspace.json"));
  const skills = readJson(path.join(dir, ".starwork", "skills.json"));
  assert.match(output, /需要创建项目时，先用 starworkSpawn 设计，或直接运行 starwork spawn/);
  assert.match(output, /运行 starwork audit 巡检项目中心里的项目登记/);
  assert.equal(state.workspace_type, "hub");
  assert.equal(state.kit, "hub");
  assert.equal(state.packs[0].id, "hub-management");
  assert.equal(skills.skills[0].id, "starworkSpawn");
  assert.equal(skills.skills[0].source.kind, "kit");
  assert.equal(fs.existsSync(path.join(dir, "技能", "starworkSpawn", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(dir, "技能", "registry.json")), true);
  assert.equal(fs.existsSync(path.join(dir, "项目", "registry.json")), true);
  assert.equal(fs.existsSync(path.join(dir, "知识", "README.md")), true);
  assert.equal(fs.existsSync(path.join(dir, ".starwork", "handoff", "state.json")), true);
  assert.equal(fs.existsSync(path.join(dir, "_系统")), false);
  assert.equal(fs.existsSync(path.join(dir, "projects")), false);
  assert.equal(fs.existsSync(path.join(dir, "skills")), false);
  assert.equal(fs.existsSync(path.join(dir, ".incoming", "README.md")), true);
});

test("does not overwrite existing user files", () => {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, "README.md"), "# Existing\n", "utf8");

  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);

  assert.equal(fs.readFileSync(path.join(dir, "README.md"), "utf8"), "# Existing\n");
  assert.equal(fs.existsSync(path.join(dir, "README.starwork-new.md")), true);
});

test("doctor passes on a single-light workspace with general pack", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);

  const result = runDoctor(["--target", dir]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /这个工作台结构完整，可以继续使用/);
  assert.doesNotMatch(result.stdout, /^Kit:/m);
  assert.doesNotMatch(result.stdout, /^Packs:/m);
  assert.doesNotMatch(result.stdout, /Workspace is healthy/);
});

test("doctor passes on a project workspace with content creator pack", () => {
  const dir = tempDir();
  runInit(["--type", "project", "--pack", "content-creator", "--target", dir, "--yes"]);

  const result = runDoctor(["--target", dir, "--json"]);
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.equal(report.ok, true);
  assert.equal(report.workspace.workspace_type, "project");
  assert.deepEqual(report.workspace.packs, ["content-creator"]);
});

test("doctor passes on a hub workspace", () => {
  const dir = tempDir();
  runInit(["--type", "hub", "--target", dir, "--yes"]);

  const result = runDoctor(["--target", dir]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /这个工作台结构完整，可以继续使用/);
});

test("doctor warns when hub rules mention old hub paths", () => {
  const dir = tempDir();
  runInit(["--type", "hub", "--target", dir, "--yes"]);
  fs.appendFileSync(path.join(dir, "AGENTS.md"), "\n旧路径：.starwork/projects/registry.json .starwork/coordination/ .starwork/incoming/\n", "utf8");

  const result = runDoctor(["--target", dir, "--json"]);
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert(report.checks.some((check) => check.id === "hub.rules.agents_md.paths" && check.level === "warn"));
});

test("doctor warns when a project center has duplicate semantic directories", () => {
  const dir = tempDir();
  runInit(["--type", "hub", "--target", dir, "--yes"]);
  fs.mkdirSync(path.join(dir, "knowledge"), { recursive: true });

  const result = runDoctor(["--target", dir, "--json"]);
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert(report.checks.some((check) => check.id === "hub.semantic_duplicate_dirs" && check.level === "warn"));
});

test("multiagent init creates custom agent lanes without built-in defaults", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);

  const lanes = runCommand(["multiagent", "init", "--target", dir, "--lanes", "research,writing", "--yes"]);
  const registry = fs.readFileSync(path.join(dir, "_系统", "协作", "agent-lanes.md"), "utf8");
  const shared = fs.readFileSync(path.join(dir, "_系统", "协作", "shared.md"), "utf8");

  assert.equal(lanes.status, 0);
  assert.match(registry, /\| lane \| purpose \| current_session \| write_scope \| worklog \| workspace \|/);
  assert.match(registry, /\| research \| 待补充 \| unbound \| 待补充 \| lanes\/research\/worklog\.md \| lanes\/research\/workspace \|/);
  assert.match(registry, /\| writing \| 待补充 \| unbound \| 待补充 \| lanes\/writing\/worklog\.md \| lanes\/writing\/workspace \|/);
  assert.doesNotMatch(registry, /backend|frontend|test/);
  assert.match(shared, /# Shared Agent Context/);
  assert.equal(fs.existsSync(path.join(dir, "_系统", "协作", "lanes", "research", "worklog.md")), true);
  assert.equal(fs.existsSync(path.join(dir, "_系统", "协作", "lanes", "research", "workspace", "README.md")), true);
});

test("multiagent init uses English collaboration paths for English workspaces", () => {
  const dir = tempDir();
  runInit(["--type", "project", "--pack", "general", "--language", "en", "--target", dir, "--yes"]);

  const lanes = runCommand(["multiagent", "init", "--target", dir, "--lanes", "research", "--yes"]);
  const registry = fs.readFileSync(path.join(dir, "_system", "collaboration", "agent-lanes.md"), "utf8");
  const workspaceReadme = fs.readFileSync(path.join(dir, "_system", "collaboration", "lanes", "research", "workspace", "README.md"), "utf8");

  assert.equal(lanes.status, 0);
  assert.match(registry, /\| research \| 待补充 \| unbound/);
  assert.match(workspaceReadme, /_system\/collaboration\/shared\.md/);
  assert.equal(fs.existsSync(path.join(dir, "_系统", "协作")), false);
  assert.equal(fs.existsSync(path.join(dir, ".starwork", "agent-lanes", "state.json")), true);
});

test("multiagent add bind share and status update markdown state", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);
  runCommand(["multiagent", "init", "--target", dir, "--yes"]);

  const add = runCommand([
    "multiagent", "add", "review",
    "--purpose", "审校和风险检查",
    "--write", "reviews/**,product/docs/**",
    "--target", dir,
    "--yes"
  ]);
  const bind = runCommand([
    "multiagent", "bind", "review",
    "--session", "codex:manual-review-1",
    "--target", dir,
    "--yes"
  ]);
  const share = runCommand([
    "multiagent", "share", "review",
    "--title", "Review checklist",
    "--path", "_系统/协作/lanes/review/workspace/review-checklist.md",
    "--audience", "writing",
    "--status", "draft",
    "--target", dir,
    "--yes"
  ]);
  const status = runCommand(["multiagent", "status", "--target", dir, "--json"]);
  const report = JSON.parse(status.stdout);
  const registry = fs.readFileSync(path.join(dir, "_系统", "协作", "agent-lanes.md"), "utf8");
  const shared = fs.readFileSync(path.join(dir, "_系统", "协作", "shared.md"), "utf8");

  assert.equal(add.status, 0);
  assert.equal(bind.status, 0);
  assert.equal(share.status, 0);
  assert.match(share.stdout, /其他职责位可以查看：_系统\/协作\/shared\.md/);
  assert.equal(status.status, 0);
  assert.match(registry, /\| review \| 审校和风险检查 \| codex:manual-review-1 \| reviews\/\*\*,product\/docs\/\*\* \| lanes\/review\/worklog\.md \| lanes\/review\/workspace \|/);
  assert.match(shared, /\| review \| Review checklist \| _系统\/协作\/lanes\/review\/workspace\/review-checklist\.md \| writing \| draft \|/);
  assert.equal(fs.existsSync(path.join(dir, "_系统", "协作", "lanes", "review", "workspace", "README.md")), true);
  assert.equal(report.schema, "starwork.agent_lanes.status.v0.1");
  assert.equal(report.lanes[0].lane, "review");
  assert.equal(report.lanes[0].current_session, "codex:manual-review-1");
  assert.equal(report.lanes[0].workspace, "lanes/review/workspace");
  assert.equal(report.shared_outputs[0].title, "Review checklist");

  const humanStatus = runCommand(["multiagent", "status", "--target", dir]);
  assert.match(humanStatus.stdout, /StarWork 多 AI 协作状态/);
  assert.match(humanStatus.stdout, /职责位：1 个；已绑定会话：1 个；共享输出：1 项/);
});

test("multiagent bind can sync codex host session name", () => {
  const dir = tempDir();
  const inputPath = path.join(tempDir(), "codex-input.jsonl");
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);
  runCommand(["multiagent", "init", "--target", dir, "--yes"]);
  runCommand([
    "multiagent", "add", "research",
    "--purpose", "新功能预研",
    "--write", "_系统/协作/lanes/research/**",
    "--target", dir,
    "--yes"
  ]);

  const fakeCodex = fakeCodexBin({ inputPath });
  const bind = runCommand([
    "multiagent", "bind", "research",
    "--session", "codex:test-thread-1",
    "--session-name", "StarWork 新功能预研 Agent",
    "--target", dir,
    "--json",
    "--yes"
  ], { env: fakeCodex.env });
  const result = JSON.parse(bind.stdout);
  const input = fs.readFileSync(inputPath, "utf8");
  const registry = fs.readFileSync(path.join(dir, "_系统", "协作", "agent-lanes.md"), "utf8");

  assert.equal(bind.status, 0);
  assert.equal(result.session_name_sync.status, "ok");
  assert.equal(result.session_name_sync.name, "StarWork 新功能预研 Agent");
  assert.match(input, /"method":"initialize"/);
  assert.match(input, /"method":"thread\/name\/set"/);
  assert.match(input, /"threadId":"test-thread-1"/);
  assert.match(registry, /codex:test-thread-1/);
});

test("multiagent bind keeps binding when host session rename fails", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);
  runCommand(["multiagent", "init", "--target", dir, "--yes"]);
  runCommand([
    "multiagent", "add", "maintenance",
    "--purpose", "CLI 维护",
    "--write", "product/cli/**",
    "--target", dir,
    "--yes"
  ]);

  const fakeCodex = fakeCodexBin({ exitCode: 1, stderr: "app-server unavailable" });
  const bind = runCommand([
    "multiagent", "bind", "maintenance",
    "--session", "codex:test-thread-2",
    "--session-name", "StarWork CLI 维护 Agent",
    "--target", dir,
    "--json",
    "--yes"
  ], { env: fakeCodex.env });
  const result = JSON.parse(bind.stdout);
  const registry = fs.readFileSync(path.join(dir, "_系统", "协作", "agent-lanes.md"), "utf8");

  assert.equal(bind.status, 0);
  assert.equal(result.session_name_sync.status, "warning");
  assert.match(result.session_name_sync.warning, /app-server unavailable/);
  assert.match(registry, /codex:test-thread-2/);
});

test("multiagent bind --pin records host metadata without rollback when pin is unsupported", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);
  runCommand(["multiagent", "init", "--target", dir, "--yes"]);
  runCommand([
    "multiagent", "add", "development",
    "--purpose", "功能开发",
    "--write", "product/cli/**",
    "--target", dir,
    "--yes"
  ]);

  const fakeCodex = fakeCodexBin();
  const bind = runCommand([
    "multiagent", "bind", "development",
    "--session", "codex:dev-thread-1",
    "--session-name", "StarWork 开发 Agent",
    "--pin",
    "--target", dir,
    "--json",
    "--yes"
  ], { env: fakeCodex.env });
  const result = JSON.parse(bind.stdout);
  const registry = fs.readFileSync(path.join(dir, "_系统", "协作", "agent-lanes.md"), "utf8");
  const state = readJson(path.join(dir, ".starwork", "agent-lanes", "state.json"));

  assert.equal(bind.status, 0);
  assert.equal(result.pin_sync.status, "unsupported");
  assert.match(registry, /codex:dev-thread-1/);
  assert.equal(state.lanes.development.thread_id, "dev-thread-1");
  assert.equal(state.lanes.development.current_session, "codex:dev-thread-1");
});

test("multiagent status --host and read expose Codex observations", () => {
  const dir = tempDir();
  const inputPath = path.join(tempDir(), "codex-input.jsonl");
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);
  runCommand(["multiagent", "init", "--target", dir, "--yes"]);
  runCommand(["multiagent", "add", "development", "--purpose", "功能开发", "--write", "product/cli/**", "--target", dir, "--yes"]);
  runCommand(["multiagent", "bind", "development", "--session", "codex:dev-thread-2", "--target", dir, "--yes"], { env: fakeCodexBin().env });

  const fakeCodex = fakeCodexBin({ inputPath });
  const status = runCommand(["multiagent", "status", "--host", "--target", dir, "--json"], { env: fakeCodex.env });
  const statusLoad = runCommand(["multiagent", "status", "--host", "--load", "--target", dir, "--json"], { env: fakeCodex.env });
  const read = runCommand(["multiagent", "read", "development", "--turns", "1", "--target", dir, "--json"], { env: fakeCodex.env });
  const report = JSON.parse(status.stdout);
  const loadReport = JSON.parse(statusLoad.stdout);
  const readReport = JSON.parse(read.stdout);
  const input = fs.readFileSync(inputPath, "utf8");

  assert.equal(status.status, 0);
  assert.equal(statusLoad.status, 0);
  assert.equal(report.schema, "starwork.agent_lanes.host_status.v0.2");
  assert.equal(loadReport.schema, "starwork.agent_lanes.host_status.v0.2");
  assert.equal(report.lanes[0].starwork.session, "codex:dev-thread-2");
  assert.equal(report.lanes[0].host.status, "idle");
  assert.equal(report.lanes[0].host.turn_count, 2);
  assert.equal(read.status, 0);
  assert.equal(readReport.host.turns.length, 1);
  assert.match(input, /"method":"thread\/read"/);
  assert.match(input, /"method":"thread\/resume"/);
});

test("multiagent instruct records shared request and sends formatted Codex instruction", () => {
  const dir = tempDir();
  const inputPath = path.join(tempDir(), "codex-input.jsonl");
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);
  runCommand(["multiagent", "init", "--target", dir, "--yes"]);
  runCommand(["multiagent", "add", "product-planning", "--purpose", "产品规划", "--write", "product/planning/**", "--target", dir, "--yes"]);
  runCommand(["multiagent", "add", "development", "--purpose", "功能开发", "--write", "product/cli/**", "--target", dir, "--yes"]);
  runCommand(["multiagent", "bind", "development", "--session", "codex:dev-thread-3", "--target", dir, "--yes"], { env: fakeCodexBin().env });

  const fakeCodex = fakeCodexBin({ inputPath });
  const instruct = runCommand([
    "multiagent", "instruct", "development",
    "--from", "product-planning",
    "--message", "请开始实现 v0.2。",
    "--target", dir,
    "--json",
    "--yes"
  ], { env: fakeCodex.env });
  const result = JSON.parse(instruct.stdout);
  const shared = fs.readFileSync(path.join(dir, "_系统", "协作", "shared.md"), "utf8");
  const state = readJson(path.join(dir, ".starwork", "agent-lanes", "state.json"));
  const input = fs.readFileSync(inputPath, "utf8");

  assert.equal(instruct.status, 0);
  assert.equal(result.host_delivery.status, "completed");
  assert.match(shared, /Cross-Lane Requests/);
  assert.match(shared, /product-planning \| development \| 请开始实现 v0\.2。 \| completed \| completed/);
  assert.equal(state.requests[0].host_delivery.thread_id, "dev-thread-3");
  assert.match(input, /"method":"thread\/resume"/);
  assert.match(input, /"method":"turn\/start"/);
  assert.match(input, /STARWORK:MULTIAGENT_MESSAGE v1/);
});

test("multiagent instruct marks incomplete delivery as started_unverified", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);
  runCommand(["multiagent", "init", "--target", dir, "--yes"]);
  runCommand(["multiagent", "add", "product-planning", "--purpose", "产品规划", "--write", "product/planning/**", "--target", dir, "--yes"]);
  runCommand(["multiagent", "add", "development", "--purpose", "功能开发", "--write", "product/cli/**", "--target", dir, "--yes"]);
  runCommand(["multiagent", "bind", "development", "--session", "codex:dev-thread-4", "--target", dir, "--yes"], { env: fakeCodexBin().env });

  const fakeCodex = fakeCodexBin({ omitTurnCompleted: true });
  const instruct = runCommand([
    "multiagent", "instruct", "development",
    "--from", "product-planning",
    "--message", "请开始实现 v0.3。",
    "--target", dir,
    "--json",
    "--yes",
    "--timeout", "1000"
  ], { env: fakeCodex.env });
  const result = JSON.parse(instruct.stdout);
  const shared = fs.readFileSync(path.join(dir, "_系统", "协作", "shared.md"), "utf8");
  const state = readJson(path.join(dir, ".starwork", "agent-lanes", "state.json"));

  assert.equal(instruct.status, 0);
  assert.equal(result.host_delivery.status, "started_unverified");
  assert.match(result.host_delivery.verification_warning, /turn\/completed was not observed/);
  assert.match(shared, /product-planning \| development \| 请开始实现 v0\.3。 \| started_unverified \| started_unverified/);
  assert.equal(state.requests[0].host_delivery.status, "started_unverified");
});

test("multiagent bind detects Claude Code session from environment and outputs resume command", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);
  runCommand(["multiagent", "init", "--target", dir, "--yes"]);
  runCommand(["multiagent", "add", "research", "--purpose", "预研", "--write", "_系统/协作/lanes/research/**", "--target", dir, "--yes"]);

  const bind = runCommand([
    "multiagent", "bind", "research",
    "--agent", "claude-code",
    "--target", dir,
    "--json",
    "--yes"
  ], { env: { CLAUDE_CODE_SESSION_ID: "claude-session-1" } });
  const result = JSON.parse(bind.stdout);
  const state = readJson(path.join(dir, ".starwork", "agent-lanes", "state.json"));
  const continued = runCommand(["multiagent", "continue", "research", "--target", dir, "--json"]);
  const continueResult = JSON.parse(continued.stdout);

  assert.equal(bind.status, 0);
  assert.equal(result.session, "claude-code:claude-session-1");
  assert.equal(state.lanes.research.host, "claude-code");
  assert.equal(state.lanes.research.thread_id, null);
  assert.equal(continued.status, 0);
  assert.equal(continueResult.status, "manual_command");
  assert.equal(continueResult.command, "claude --resume claude-session-1");
});

test("multiagent read summarizes Claude Code transcript without dumping full transcript", () => {
  const dir = tempDir();
  const transcriptDir = tempDir();
  const transcript = path.join(transcriptDir, "claude-session-2.jsonl");
  fs.writeFileSync(transcript, [
    JSON.stringify({ uuid: "u1", message: { role: "user", content: "请分析这个项目的 Host Adapter 需求。" } }),
    JSON.stringify({ uuid: "a1", message: { role: "assistant", content: [{ type: "text", text: "可以，先从宿主能力表开始，不要写私有 transcript。" }] } })
  ].join("\n") + "\n", "utf8");
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);
  runCommand(["multiagent", "init", "--target", dir, "--yes"]);
  runCommand(["multiagent", "add", "research", "--purpose", "预研", "--write", "_系统/协作/lanes/research/**", "--target", dir, "--yes"]);
  runCommand(["multiagent", "bind", "research", "--session", "claude-code:claude-session-2", "--target", dir, "--yes"]);

  const read = runCommand(["multiagent", "read", "research", "--turns", "1", "--transcript", transcript, "--target", dir, "--json"]);
  const status = runCommand(["multiagent", "status", "--host", "--transcript", transcriptDir, "--target", dir, "--json"]);
  const report = JSON.parse(read.stdout);
  const statusReport = JSON.parse(status.stdout);

  assert.equal(read.status, 0);
  assert.equal(status.status, 0);
  assert.equal(report.host.adapter, "claude-code");
  assert.equal(report.host.readable, true);
  assert.equal(report.host.turns.length, 1);
  assert.equal(report.host.turns[0].role, "assistant");
  assert.match(report.host.turns[0].summary, /不要写私有 transcript/);
  assert.equal(statusReport.lanes[0].host.readable, true);
  assert.equal(statusReport.lanes[0].host.turn_count, 2);
});

test("multiagent instruct returns manual handoff for Trae lane instead of fake delivery", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);
  runCommand(["multiagent", "init", "--target", dir, "--yes"]);
  runCommand(["multiagent", "add", "product-planning", "--purpose", "产品规划", "--write", "product/planning/**", "--target", dir, "--yes"]);
  runCommand(["multiagent", "add", "development", "--purpose", "功能开发", "--write", "product/cli/**", "--target", dir, "--yes"]);
  runCommand(["multiagent", "bind", "development", "--session", "trae:dev-session-1", "--target", dir, "--yes"]);

  const instruct = runCommand([
    "multiagent", "instruct", "development",
    "--from", "product-planning",
    "--message", "请继续处理 Host Adapter。",
    "--target", dir,
    "--json",
    "--yes"
  ]);
  const result = JSON.parse(instruct.stdout);
  const shared = fs.readFileSync(path.join(dir, "_系统", "协作", "shared.md"), "utf8");
  const state = readJson(path.join(dir, ".starwork", "agent-lanes", "state.json"));

  assert.equal(instruct.status, 0);
  assert.equal(result.host_delivery.adapter, "trae");
  assert.equal(result.host_delivery.status, "manual_handoff_required");
  assert.match(result.host_delivery.formatted_message, /STARWORK:MULTIAGENT_MESSAGE v1/);
  assert.match(shared, /product-planning \| development \| 请继续处理 Host Adapter。 \| manual_handoff_required \| manual_handoff_required/);
  assert.equal(state.requests[0].host_delivery.status, "manual_handoff_required");
});

test("init --adapter creates host adapter state after workspace initialization", () => {
  const dir = tempDir();

  const init = runCommand(["init", "--type", "project", "--pack", "general", "--target", dir, "--adapter", "cursor", "--yes"]);
  const adaptersState = readJson(path.join(dir, ".starwork", "adapters.json"));

  assert.equal(init.status, 0);
  assert.equal(adaptersState.adapters.cursor.enabled, true);
  assert.equal(adaptersState.adapters.cursor.rules_entry, ".cursor/rules/starwork.mdc");
  assert.equal(fs.existsSync(path.join(dir, ".cursor", "skills")), true);
});

test("multiagent launch creates and binds Codex threads with launch message", () => {
  const dir = tempDir();
  const inputPath = path.join(tempDir(), "codex-input.jsonl");
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);
  runCommand(["multiagent", "init", "--target", dir, "--yes"]);
  runCommand(["multiagent", "add", "development", "--purpose", "功能开发", "--write", "product/cli/**", "--target", dir, "--yes"]);

  const fakeCodex = fakeCodexBin({ inputPath });
  const launch = runCommand(["multiagent", "launch", "development", "--target", dir, "--json", "--yes", "--timeout", "1000"], { env: fakeCodex.env });
  const result = JSON.parse(launch.stdout);
  const registry = fs.readFileSync(path.join(dir, "_系统", "协作", "agent-lanes.md"), "utf8");
  const state = readJson(path.join(dir, ".starwork", "agent-lanes", "state.json"));
  const input = fs.readFileSync(inputPath, "utf8");

  assert.equal(launch.status, 0);
  assert.equal(result.launches[0].thread_id, "launched-thread-1");
  assert.match(registry, /codex:launched-thread-1/);
  assert.equal(state.lanes.development.thread_id, "launched-thread-1");
  assert.match(input, /"method":"thread\/start"/);
  assert.match(input, new RegExp(`"cwd":"${dir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  assert.match(input, /"sandbox":"workspace-write"/);
  assert.match(input, /"approvalPolicy":"on-request"/);
  assert.match(input, /StarWork MultiAgent Launch/);
});

test("multiagent launch does not bind when launch message delivery fails", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);
  runCommand(["multiagent", "init", "--target", dir, "--yes"]);
  runCommand(["multiagent", "add", "development", "--purpose", "功能开发", "--write", "product/cli/**", "--target", dir, "--yes"]);

  const fakeCodex = fakeCodexBin({ failTurnStart: true });
  const launch = runCommand(["multiagent", "launch", "development", "--target", dir, "--json", "--yes", "--timeout", "1000"], { env: fakeCodex.env });
  const result = JSON.parse(launch.stdout);
  const registry = fs.readFileSync(path.join(dir, "_系统", "协作", "agent-lanes.md"), "utf8");
  const state = readJson(path.join(dir, ".starwork", "agent-lanes", "state.json"));

  assert.equal(launch.status, 0);
  assert.equal(result.launches[0].status, "failed");
  assert.equal(result.launches[0].created_thread_id, "launched-thread-1");
  assert.equal(result.launches[0].thread_id, undefined);
  assert.match(registry, /\| development \| 功能开发 \| unbound \|/);
  assert.equal(state.lanes.development?.thread_id, undefined);
});

test("multiagent launch binds when final verification read times out after completion", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);
  runCommand(["multiagent", "init", "--target", dir, "--yes"]);
  runCommand(["multiagent", "add", "development", "--purpose", "功能开发", "--write", "product/cli/**", "--target", dir, "--yes"]);

  const fakeCodex = fakeCodexBin({ omitFinalRead: true });
  const launch = runCommand(["multiagent", "launch", "development", "--target", dir, "--json", "--yes", "--timeout", "1000"], { env: fakeCodex.env });
  const result = JSON.parse(launch.stdout);
  const registry = fs.readFileSync(path.join(dir, "_系统", "协作", "agent-lanes.md"), "utf8");

  assert.equal(launch.status, 0);
  assert.equal(result.launches[0].status, "completed");
  assert.equal(result.launches[0].thread_id, "launched-thread-1");
  assert.equal(result.launches[0].verified_by_thread_read, false);
  assert.match(result.launches[0].verification_warning, /response 4/);
  assert.match(registry, /codex:launched-thread-1/);
});

test("multiagent status infers workspace for legacy registries", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);
  runCommand(["multiagent", "init", "--target", dir, "--yes"]);
  fs.writeFileSync(path.join(dir, "_系统", "协作", "agent-lanes.md"), `# Agent Lanes

## Lanes

| lane | purpose | current_session | write_scope | worklog |
|---|---|---|---|---|
| legacy | 旧版职责 | unbound | legacy/** | lanes/legacy/worklog.md |
`);

  const status = runCommand(["multiagent", "status", "--target", dir, "--json"]);
  const report = JSON.parse(status.stdout);

  assert.equal(status.status, 0);
  assert.equal(report.lanes[0].lane, "legacy");
  assert.equal(report.lanes[0].workspace, "lanes/legacy/workspace");
});

test("spawn creates a project from a hub", () => {
  const hub = tempDir();
  const target = tempDir();
  runInit(["--type", "hub", "--target", hub, "--yes"]);

  const spawn = runCommand(["spawn", "--hub", hub, "--name", "Content Site", "--id", "content-site", "--target", target, "--mode", "project", "--yes"]);
  const state = readJson(path.join(target, ".starwork", "workspace.json"));
  const sync = readJson(path.join(target, ".core-sync.json"));
  const skills = readJson(path.join(target, ".starwork", "skills.json"));
  const registry = readJson(path.join(hub, "项目", "registry.json"));
  const doctor = runDoctor(["--target", target, "--json"]);
  const report = JSON.parse(doctor.stdout);

  assert.equal(spawn.status, 0);
  assert.equal(state.workspace_type, "project");
  assert.equal(state.kit, "project");
  assert.equal(state.project_center.project_id, "content-site");
  assert.equal(state.project_center.path, hub);
  assert.equal(state.hub.project_id, "content-site");
  assert.equal(sync.project_id, "content-site");
  assert.equal(registry.projects[0].id, "content-site");
  assert.equal(registry.projects[0].path, path.resolve(target));
  assert.equal(fs.existsSync(path.join(target, "知识")), false);
  assert.equal(fs.existsSync(path.join(target, "知识库")), false);
  assert.equal(fs.existsSync(path.join(target, ".starwork", "handoff", "state.json")), true);
  assert.equal(fs.existsSync(path.join(target, "_系统", "主库同步", "README.md")), true);
  assert.match(fs.readFileSync(path.join(target, "AGENTS.md"), "utf8"), /_系统\/主库同步\/README\.md/);
  assert.match(fs.readFileSync(path.join(target, "_系统", "身份", "README.md"), "utf8"), /来自项目中心/);
  assert.match(fs.readFileSync(path.join(target, "_系统", "教训", "README.md"), "utf8"), /来自项目中心/);
  assert.equal(fs.lstatSync(path.join(target, ".agents", "skills")).isDirectory(), true);
  assert(skills.skills.some((skill) => skill.id === "neat-freak"));
  assert.equal(sync.resources.skills.mode, "selected");
  assert.equal(doctor.status, 0);
});

test("spawn rejects removed matter mode", () => {
  const hub = tempDir();
  const target = tempDir();
  runInit(["--type", "hub", "--target", hub, "--yes"]);

  const spawn = runCommand(["spawn", "--hub", hub, "--name", "Old Matter", "--target", target, "--mode", "matter", "--yes"]);

  assert.equal(spawn.status, 1);
  assert.match(spawn.stderr, /不支持的 spawn 模式：matter/);
});

test("spawn creates a starter project from a hub", () => {
  const hub = tempDir();
  const target = tempDir();
  runInit(["--type", "hub", "--target", hub, "--yes"]);

  const spawn = runCommand(["spawn", "--hub", hub, "--name", "Quick Project", "--id", "quick-project", "--target", target, "--mode", "starter", "--yes"]);
  const state = readJson(path.join(target, ".starwork", "workspace.json"));
  const doctor = runDoctor(["--target", target, "--json"]);
  const report = JSON.parse(doctor.stdout);

  assert.equal(spawn.status, 0);
  assert.equal(state.workspace_type, "project");
  assert.equal(state.kit, "project");
  assert.equal(fs.existsSync(path.join(target, "事项")), false);
  assert.equal(doctor.status, 0);
});

test("spawn creates an English starter satellite from a hub", () => {
  const hub = tempDir();
  const target = tempDir();
  runInit(["--type", "hub", "--language", "en", "--target", hub, "--yes"]);

  const spawn = runCommand(["spawn", "--hub", hub, "--name", "English Project", "--id", "english-project", "--target", target, "--mode", "starter", "--language", "en", "--yes"]);
  const state = readJson(path.join(target, ".starwork", "workspace.json"));
  const sync = readJson(path.join(target, ".core-sync.json"));
  const doctor = runDoctor(["--target", target, "--json"]);
  const report = JSON.parse(doctor.stdout);

  assert.equal(spawn.status, 0);
  assert.equal(state.language, "en");
  assert.equal(state.workspace_type, "project");
  assert.equal(state.paths.formal_source, "outputs/final/");
  assert.equal(state.paths.business_work_area, "outputs/drafts/");
  assert.equal(sync.resources.identity.target, "_system/identity");
  assert.equal(Object.hasOwn(sync.resources, "knowledge"), false);
  assert.equal(fs.existsSync(path.join(target, "_system", "context", "current-project.md")), true);
  assert.equal(fs.existsSync(path.join(target, "_system", "tasks", "current-work.md")), true);
  assert.equal(fs.existsSync(path.join(target, "_system", "main-repo-sync", "README.md")), true);
  assert.match(fs.readFileSync(path.join(target, "AGENTS.md"), "utf8"), /_system\/main-repo-sync\/README\.md/);
  assert.match(fs.readFileSync(path.join(target, "_system", "identity", "README.md"), "utf8"), /Project Center identity snapshots/);
  assert.equal(fs.existsSync(path.join(target, "references", "README.md")), true);
  assert.equal(fs.existsSync(path.join(target, "outputs", "final", "README.md")), true);
  assert.equal(fs.existsSync(path.join(target, "knowledge")), false);
  assert.equal(fs.existsSync(path.join(target, "knowledge-base")), false);
  assert.equal(fs.existsSync(path.join(target, ".starwork", "handoff", "state.json")), true);
  assert.equal(fs.existsSync(path.join(target, "_系统")), false);
  assert.equal(fs.existsSync(path.join(target, "知识")), false);
  assert.equal(doctor.status, 0);
  assert.equal(report.ok, true);
});

test("spawn creates a customized project from a blueprint", () => {
  const hub = tempDir();
  const target = tempDir();
  const blueprintDir = tempDir();
  fs.mkdirSync(path.join(blueprintDir, "rules"), { recursive: true });
  fs.mkdirSync(path.join(blueprintDir, "seed", "会议纪要"), { recursive: true });
  fs.writeFileSync(path.join(blueprintDir, "rules", "file-boundaries.md"), "正式成果放在 {{paths.formal_source}}。\n", "utf8");
  fs.writeFileSync(path.join(blueprintDir, "rules", "workflow.md"), "当前推进放在 {{paths.business_work_area}}。\n", "utf8");
  fs.writeFileSync(path.join(blueprintDir, "seed", "会议纪要", "README.md"), "# 会议纪要\n\n项目：{{project.name}}\n", "utf8");
  fs.writeFileSync(path.join(blueprintDir, "blueprint.json"), `${JSON.stringify({
    schema: "starwork.spawn_blueprint.v0.1",
    name: "Custom Project",
    project_id: "custom-project",
    description: "用于整理会议纪要、资料库和交付物的定制项目。",
    base: {
      mode: "project",
      kit: "project",
      language: "zh"
    },
    paths: {
      formal_source: "交付物/确认版本/",
      business_work_area: "资料库/"
    },
    folders: [
      "资料库/",
      "会议纪要/",
      "版本记录/",
      "交付物/确认版本/"
    ],
    agent_rules: [
      { slot: "project.file_boundaries", from: "rules/file-boundaries.md" },
      { slot: "project.workflow", from: "rules/workflow.md" }
    ],
    seed: [
      { from: "seed/会议纪要/README.md", to: "会议纪要/README.md", on_conflict: "error" }
    ]
  }, null, 2)}\n`, "utf8");
  runInit(["--type", "hub", "--target", hub, "--yes"]);

  const spawn = runCommand(["spawn", "--hub", hub, "--target", target, "--blueprint", path.join(blueprintDir, "blueprint.json"), "--yes"]);
  const state = readJson(path.join(target, ".starwork", "workspace.json"));
  const agents = fs.readFileSync(path.join(target, "AGENTS.md"), "utf8");
  const blueprintRule = fs.readFileSync(path.join(target, ".starwork", "rules", "project.file_boundaries.md"), "utf8");
  const projectStatus = fs.readFileSync(path.join(target, "_系统", "上下文", "当前项目.md"), "utf8");
  const seed = fs.readFileSync(path.join(target, "会议纪要", "README.md"), "utf8");
  const registry = readJson(path.join(hub, "项目", "registry.json"));
  const doctor = runDoctor(["--target", target, "--json"]);
  const report = JSON.parse(doctor.stdout);

  assert.equal(spawn.status, 0);
  assert.equal(state.workspace_type, "project");
  assert.equal(state.paths.formal_source, "交付物/确认版本/");
  assert.equal(state.customization.type, "spawn_blueprint");
  assert.equal(state.customization.agent_rules[0].slot, "project.file_boundaries");
  assert.equal(fs.existsSync(path.join(target, "资料库")), true);
  assert.equal(fs.existsSync(path.join(target, "交付物", "确认版本")), true);
  assert.match(agents, /\.starwork\/rules\/index\.md/);
  assert.doesNotMatch(agents, /StarWork Rule Slot:/);
  assert.doesNotMatch(agents, /StarWork Blueprint:/);
  assert.match(blueprintRule, /正式成果放在 交付物\/确认版本\//);
  assert.match(projectStatus, /项目约定/);
  assert.doesNotMatch(projectStatus, /Blueprint|blueprint|starwork spawn|doctor|Initialized as|Folders Not Used/);
  assert.match(seed, /项目：Custom Project/);
  assert.equal(registry.projects[0].customized, true);
  assert.equal(doctor.status, 0);
  assert(report.checks.some((check) => check.id === "blueprint.folder.exists" && check.level === "pass"));
  assert(report.checks.some((check) => check.id === "blueprint.rule.injected" && check.level === "pass"));
});

test("spawn distributes selected hub-managed skills from registry", () => {
  const hub = tempDir();
  const target = tempDir();
  const blueprintDir = tempDir();
  runInit(["--type", "hub", "--target", hub, "--yes"]);
  fs.mkdirSync(path.join(hub, "技能", "meeting-summary"), { recursive: true });
  fs.writeFileSync(path.join(hub, "技能", "meeting-summary", "SKILL.md"), "# Meeting Summary\n", "utf8");
  fs.writeFileSync(path.join(hub, "技能", "registry.json"), `${JSON.stringify({
    schema: "starwork.skill_registry.v0.1",
    owner: "hub",
    updated_at: "2026-05-20T00:00:00.000Z",
    skills: [
      {
        id: "meeting-summary",
        name: "Meeting Summary",
        type: "hub-managed",
        source: { kind: "local", path: "技能/meeting-summary" },
        ownership: "hub-owned",
        distribution: { mode: "symlink", default_for_spawn: false },
        description: "会议纪要整理。"
      }
    ]
  }, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(blueprintDir, "blueprint.json"), `${JSON.stringify({
    schema: "starwork.spawn_blueprint.v0.1",
    name: "Skill Project",
    project_id: "skill-project",
    base: {
      mode: "starter",
      kit: "satellite-starter",
      language: "zh"
    },
    skills: [
      {
        id: "meeting-summary",
        source: "hub",
        distribution: "symlink",
        reason: "这个项目需要会议纪要整理。"
      }
    ]
  }, null, 2)}\n`, "utf8");

  const result = runCommand(["spawn", "--hub", hub, "--target", target, "--blueprint", path.join(blueprintDir, "blueprint.json"), "--yes"]);
  const skills = readJson(path.join(target, ".starwork", "skills.json"));
  const sync = readJson(path.join(target, ".core-sync.json"));
  const doctor = runDoctor(["--target", target, "--json"]);
  const report = JSON.parse(doctor.stdout);

  assert.equal(result.status, 0);
  const meetingSkill = skills.skills.find((skill) => skill.id === "meeting-summary");
  assert.equal(meetingSkill.source.kind, "hub");
  assert.equal(meetingSkill.distribution, "symlink");
  assert.equal(fs.lstatSync(path.join(target, ".agents", "skills")).isDirectory(), true);
  assert.equal(fs.lstatSync(path.join(target, ".agents", "skills", "meeting-summary")).isSymbolicLink(), true);
  assert.equal(fs.existsSync(path.join(target, ".agents", "skills", "starworkSpawn")), false);
  assert(sync.resources.skills.items.some((item) => item.id === "meeting-summary"));
  assert.equal(doctor.status, 0);
  assert(report.skills.mounts.some((mount) => mount.id === "meeting-summary" && mount.status === "ok"));
});

test("spawn blueprint dry-run does not write target or registry", () => {
  const hub = tempDir();
  const target = tempDir();
  const blueprintDir = tempDir();
  fs.writeFileSync(path.join(blueprintDir, "blueprint.json"), `${JSON.stringify({
    schema: "starwork.spawn_blueprint.v0.1",
    name: "Dry Blueprint",
    base: {
      mode: "starter",
      kit: "satellite-starter",
      language: "zh"
    },
    paths: {
      formal_source: "交付物/",
      business_work_area: "参考资料/"
    },
    folders: ["交付物/"]
  }, null, 2)}\n`, "utf8");
  runInit(["--type", "hub", "--target", hub, "--yes"]);

  const result = runCommand(["spawn", "--hub", hub, "--target", target, "--blueprint", path.join(blueprintDir, "blueprint.json"), "--dry-run"]);
  const registry = readJson(path.join(hub, "项目", "registry.json"));

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Blueprint/);
  assert.equal(fs.existsSync(path.join(target, ".starwork", "workspace.json")), false);
  assert.deepEqual(registry.projects, []);
});

test("spawn blueprint rejects unsafe paths", () => {
  const hub = tempDir();
  const target = tempDir();
  const blueprintDir = tempDir();
  fs.writeFileSync(path.join(blueprintDir, "blueprint.json"), `${JSON.stringify({
    schema: "starwork.spawn_blueprint.v0.1",
    name: "Unsafe Blueprint",
    base: {
      mode: "project",
      kit: "project",
      language: "zh"
    },
    paths: {
      formal_source: "../escape/",
      business_work_area: "参考资料/"
    }
  }, null, 2)}\n`, "utf8");
  runInit(["--type", "hub", "--target", hub, "--yes"]);

  const result = runCommand(["spawn", "--hub", hub, "--target", target, "--blueprint", path.join(blueprintDir, "blueprint.json"), "--yes"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /不能跳出工作区/);
});

test("spawn refuses duplicate registry id", () => {
  const hub = tempDir();
  const first = tempDir();
  const second = tempDir();
  runInit(["--type", "hub", "--target", hub, "--yes"]);
  runCommand(["spawn", "--hub", hub, "--name", "First", "--id", "same-id", "--target", first, "--yes"]);

  const duplicate = runCommand(["spawn", "--hub", hub, "--name", "Second", "--id", "same-id", "--target", second, "--yes"]);

  assert.equal(duplicate.status, 1);
  assert.match(duplicate.stderr, /已存在项目 ID/);
});

test("spawn refuses non-hub workspaces", () => {
  const workspace = tempDir();
  const target = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", workspace, "--yes"]);

  const result = runCommand(["spawn", "--hub", workspace, "--name", "Nope", "--id", "nope", "--target", target, "--yes"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /项目中心/);
});

test("spawn refuses non-empty target directories", () => {
  const hub = tempDir();
  const target = tempDir();
  fs.writeFileSync(path.join(target, "existing.txt"), "user content\n", "utf8");
  runInit(["--type", "hub", "--target", hub, "--yes"]);

  const result = runCommand(["spawn", "--hub", hub, "--name", "Existing", "--id", "existing", "--target", target, "--yes"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /目标目录已有内容/);
});

test("doctor fails when AGENTS.md is missing", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);
  fs.rmSync(path.join(dir, "AGENTS.md"));

  const result = runDoctor(["--target", dir]);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /缺少 AI 入口规则 AGENTS\.md/);
  assert.doesNotMatch(result.stdout, /core\.entry_rules\.exists/);
});

test("doctor warns when agent rules reference missing workspace paths", () => {
  const dir = tempDir();
  runInit(["--type", "project", "--pack", "general", "--target", dir, "--yes"]);
  fs.appendFileSync(path.join(dir, "AGENTS.md"), "\n请把草稿写到 `missing-drafts/`。\n", "utf8");

  const result = runDoctor(["--target", dir, "--json"]);
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert(report.checks.some((check) => check.id === "agents.references.existing_paths" && check.level === "warn" && check.message.includes("missing-drafts")));
});

test("doctor fails when the formal source is missing", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);
  fs.rmSync(path.join(dir, "输出", "确认成果"), { recursive: true, force: true });

  const result = runDoctor(["--target", dir, "--json"]);
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(report.ok, false);
  assert(report.checks.some((check) => check.id === "core.formal_source.exists" && check.level === "fail"));
});

test("doctor fails when pack seed is missing", () => {
  const dir = tempDir();
  runInit(["--type", "project", "--pack", "content-creator", "--target", dir, "--yes"]);
  fs.rmSync(path.join(dir, "选题池", "README.md"));

  const result = runDoctor(["--target", dir, "--json"]);
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert(report.checks.some((check) => check.id === "pack.seed.installed" && check.level === "fail"));
});

test("doctor fails outside a StarWork workspace", () => {
  const dir = tempDir();

  const result = runDoctor(["--target", dir]);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /不是 StarWork 工作台/);
});

test("doctor reports legacy signals for an English legacy template", () => {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, "AGENTS.md"), "# Legacy Agent Rules\n", "utf8");
  fs.mkdirSync(path.join(dir, "references"), { recursive: true });
  fs.mkdirSync(path.join(dir, "outputs", "drafts"), { recursive: true });
  fs.mkdirSync(path.join(dir, "outputs", "final"), { recursive: true });

  const result = runDoctor(["--target", dir, "--json"]);
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(report.upgrade.candidate, true);
  assert.equal(report.upgrade.source, "legacy-template");
  assert.equal(report.upgrade.inferred.language, "en");
  assert.equal(report.upgrade.inferred.workspace_type, "project");
  assert.equal(Object.hasOwn(report.upgrade.inferred, "pack"), false);
  assert.equal(Object.hasOwn(report.upgrade, "next_steps"), false);
  assert.deepEqual(report.upgrade.inferred.references, ["references"]);
  assert(report.upgrade.inferred.outputs.includes("outputs"));
  assert(report.upgrade.inferred.reasons.language.some((reason) => reason.includes("英文工作区信号")));
  assert(report.upgrade.inferred.reasons.outputs.some((reason) => reason.includes("outputs")));
  assert(report.checks.some((check) => check.id === "legacy.references.detected" && check.level === "info"));
});

test("doctor exposes inventory and semantic signals for non-standard legacy folders", () => {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, "README.md"), "# Custom Workspace\n", "utf8");
  fs.mkdirSync(path.join(dir, "资料库", "文章"), { recursive: true });
  fs.mkdirSync(path.join(dir, "成稿"), { recursive: true });
  fs.mkdirSync(path.join(dir, "推进"), { recursive: true });

  const result = runDoctor(["--target", dir, "--json"]);
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(report.target, path.resolve(dir));
  assert(report.inventory.directories.some((item) => item.path === "资料库"));
  assert(report.inventory.directories.some((item) => item.path === "成稿"));
  assert(report.inventory.files.some((item) => item.path === "README.md"));
  assert(report.signals.possible_reference_dirs.includes("资料库"));
  assert(report.signals.possible_output_dirs.includes("成稿"));
  assert(report.signals.possible_current_work_dirs.includes("推进"));
  assert(report.signals.readonly_candidate_dirs.includes("资料库"));
  assert(report.signals.writable_candidate_dirs.includes("推进"));
  assert(report.upgrade.inferred.reasons.references.some((reason) => reason.includes("资料库")));
  assert.equal(report.upgrade.candidate, true);
});

test("doctor reports legacy signals for a Chinese legacy template with matter folder", () => {
  const dir = tempDir();
  fs.mkdirSync(path.join(dir, "_系统", "身份"), { recursive: true });
  fs.mkdirSync(path.join(dir, "事项"), { recursive: true });
  fs.mkdirSync(path.join(dir, "参考资料"), { recursive: true });
  fs.mkdirSync(path.join(dir, "输出", "确认成果"), { recursive: true });

  const result = runDoctor(["--target", dir]);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /旧目录识别/);
  assert.match(result.stdout, /推测用途：一个项目工作台/);
  assert.match(result.stdout, /推测语言：中文/);
  assert.match(result.stdout, /不会自动移动、删除或修改你的文件/);
  assert.doesNotMatch(result.stdout, /confidence/);
  assert.doesNotMatch(result.stdout, /--dry-run/);
  assert.doesNotMatch(result.stdout, /下一步/);
});

test("upgrade blueprint dry-run does not write files", () => {
  const dir = tempDir();
  const blueprintDir = tempDir();
  fs.writeFileSync(path.join(dir, "AGENTS.md"), "# Existing Agent\n", "utf8");
  fs.mkdirSync(path.join(dir, "资料库"), { recursive: true });
  fs.mkdirSync(path.join(dir, "成稿"), { recursive: true });
  fs.writeFileSync(path.join(blueprintDir, "upgrade-blueprint.json"), `${JSON.stringify({
    schema: "starwork.upgrade_blueprint.v0.1",
    generated_by: "starworkDoctor",
    source: {
      doctor_schema: "starwork.doctor.result.v0.1",
      diagnosis: "legacy-template",
      core_fit: "medium"
    },
    base: {
      workspace_type: "single-light",
      kit: "local-starter",
      language: "zh",
      pack: "general"
    },
    strategy: "preserve-names",
    paths: {
      formal_source: "成稿/",
      business_work_area: "资料库/"
    },
    core_role_mapping: [],
    actions: [
      { type: "ensure_dir", path: ".starwork/" },
      { type: "write_workspace_state" },
      { type: "copy_kit_missing_files" }
    ]
  }, null, 2)}\n`, "utf8");

  const result = runCommand(["upgrade", "--target", dir, "--blueprint", path.join(blueprintDir, "upgrade-blueprint.json"), "--dry-run"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /升级预览/);
  assert.equal(fs.existsSync(path.join(dir, ".starwork", "workspace.json")), false);
});

test("upgrade applies a blueprint and keeps existing files", () => {
  const dir = tempDir();
  const blueprintDir = tempDir();
  fs.mkdirSync(path.join(blueprintDir, "rules"), { recursive: true });
  fs.writeFileSync(path.join(dir, "AGENTS.md"), "# Existing Agent\n\nKeep me.\n", "utf8");
  fs.mkdirSync(path.join(dir, "资料库"), { recursive: true });
  fs.mkdirSync(path.join(dir, "成稿"), { recursive: true });
  fs.mkdirSync(path.join(dir, "事项"), { recursive: true });
  fs.writeFileSync(path.join(blueprintDir, "rules", "core-boundaries.md"), "正式成果：{{paths.formal_source}}\n当前工作：{{paths.business_work_area}}\n", "utf8");
  fs.writeFileSync(path.join(blueprintDir, "upgrade-blueprint.json"), `${JSON.stringify({
    schema: "starwork.upgrade_blueprint.v0.1",
    target: ".",
    generated_by: "starworkDoctor",
    source: {
      doctor_schema: "starwork.doctor.result.v0.1",
      diagnosis: "legacy-template",
      core_fit: "medium"
    },
    base: {
      workspace_type: "project",
      kit: "project",
      language: "zh",
      pack: "general"
    },
    strategy: "preserve-names",
    paths: {
      formal_source: "成稿/",
      business_work_area: "资料库/"
    },
    core_role_mapping: [
      { role: "references", path: "资料库/", confidence: "high", reason: "用户确认" },
      { role: "formal_source", path: "成稿/", confidence: "high", reason: "用户确认" }
    ],
    actions: [
      { type: "ensure_dir", path: ".starwork/" },
      { type: "write_workspace_state" },
      { type: "copy_kit_missing_files" },
      { type: "inject_agent_rules", target: "AGENTS.md", from: "rules/core-boundaries.md", slot: "upgrade.core_boundaries" }
    ],
    preserve: ["资料库/", "成稿/"],
    verification: {
      run_doctor_after: true,
      expected_workspace_type: "project"
    }
  }, null, 2)}\n`, "utf8");

  const result = runCommand(["upgrade", "--target", dir, "--blueprint", path.join(blueprintDir, "upgrade-blueprint.json"), "--yes"]);
  const state = readJson(path.join(dir, ".starwork", "workspace.json"));
  const agents = fs.readFileSync(path.join(dir, "AGENTS.md"), "utf8");
  const upgradeRule = fs.readFileSync(path.join(dir, ".starwork", "rules", "upgrade.core_boundaries.md"), "utf8");
  const doctor = runDoctor(["--target", dir, "--json"]);
  const report = JSON.parse(doctor.stdout);

  assert.equal(result.status, 0);
  assert.equal(state.workspace_type, "project");
  assert.equal(state.kit, "project");
  assert.equal(state.paths.formal_source, "成稿/");
  assert.equal(state.paths.business_work_area, "资料库/");
  assert.equal(state.upgrade.type, "upgrade_blueprint");
  assert.match(agents, /Keep me/);
  assert.match(agents, /\.starwork\/rules\/index\.md/);
  assert.doesNotMatch(agents, /StarWork Rule Slot:/);
  assert.doesNotMatch(agents, /StarWork Upgrade:/);
  assert.match(upgradeRule, /正式成果：成稿\//);
  assert.equal(fs.existsSync(path.join(dir, "_系统", "上下文", "当前项目.md")), true);
  assert.equal(doctor.status, 0);
  assert.equal(report.ok, true);
});

test("hub upgrade dry-run does not create duplicate standard dirs", () => {
  const dir = tempDir();
  const blueprintDir = tempDir();
  fs.mkdirSync(path.join(dir, "projects", "coordination"), { recursive: true });
  fs.mkdirSync(path.join(dir, "knowledge"), { recursive: true });
  fs.mkdirSync(path.join(dir, "identity"), { recursive: true });
  fs.mkdirSync(path.join(dir, "lessons"), { recursive: true });
  fs.mkdirSync(path.join(dir, "skills"), { recursive: true });
  fs.mkdirSync(path.join(dir, ".incoming"), { recursive: true });
  fs.writeFileSync(path.join(dir, "README.md"), "# Main Repository\n", "utf8");
  fs.writeFileSync(path.join(dir, "AGENTS.md"), "# Existing Hub Rules\n", "utf8");
  fs.writeFileSync(path.join(dir, "projects", "registry.json"), "[]\n", "utf8");
  fs.writeFileSync(path.join(blueprintDir, "upgrade-blueprint.json"), `${JSON.stringify({
    schema: "starwork.upgrade_blueprint.v0.1",
    generated_by: "starworkDoctor",
    source: {
      doctor_schema: "starwork.doctor.result.v0.1",
      diagnosis: "hub-like-main-repository",
      core_fit: "high"
    },
    base: {
      workspace_type: "hub",
      kit: "hub",
      language: "zh",
      pack: null
    },
    strategy: "preserve-names",
    paths: {
      formal_source: "projects/",
      business_work_area: "projects/coordination/"
    },
    core_role_mapping: [
      { role: "projects", path: "projects/", confidence: "high", reason: "用户确认" },
      { role: "project_registry", path: "projects/registry.json", confidence: "high", reason: "用户确认" },
      { role: "coordination", path: "projects/coordination/", confidence: "high", reason: "用户确认" },
      { role: "incoming", path: ".incoming/", confidence: "high", reason: "用户确认" },
      { role: "knowledge", path: "knowledge/", confidence: "high", reason: "用户确认" },
      { role: "identity", path: "identity/", confidence: "high", reason: "用户确认" },
      { role: "lessons", path: "lessons/", confidence: "high", reason: "用户确认" },
      { role: "skills", path: "skills/", confidence: "high", reason: "用户确认" }
    ],
    actions: [
      { type: "ensure_dir", path: ".starwork/" },
      { type: "write_workspace_state" },
      { type: "copy_kit_missing_files" }
    ],
    preserve: ["projects/", "knowledge/", "identity/", "lessons/", "skills/", ".incoming/"]
  }, null, 2)}\n`, "utf8");

  const result = runCommand(["upgrade", "--target", dir, "--blueprint", path.join(blueprintDir, "upgrade-blueprint.json"), "--json", "--dry-run"]);
  const plan = JSON.parse(result.stdout);
  const plannedPaths = plan.actions.map((action) => action.path);

  assert.equal(result.status, 0);
  assert.equal(plan.workspace_type, "hub");
  assert.equal(plan.pack, null);
  assert.equal(fs.existsSync(path.join(dir, ".starwork", "workspace.json")), false);
  assert(!plannedPaths.some((item) => item === "项目" || item.startsWith("项目/")));
  assert(!plannedPaths.some((item) => item === "知识" || item.startsWith("知识/")));
});

test("upgrade applies a hub preserve-names blueprint", () => {
  const dir = tempDir();
  const blueprintDir = tempDir();
  fs.mkdirSync(path.join(blueprintDir, "rules"), { recursive: true });
  fs.mkdirSync(path.join(dir, "projects", "coordination"), { recursive: true });
  fs.mkdirSync(path.join(dir, "knowledge"), { recursive: true });
  fs.mkdirSync(path.join(dir, "identity"), { recursive: true });
  fs.mkdirSync(path.join(dir, "lessons"), { recursive: true });
  fs.mkdirSync(path.join(dir, "skills"), { recursive: true });
  fs.mkdirSync(path.join(dir, ".incoming"), { recursive: true });
  fs.writeFileSync(path.join(dir, "README.md"), "# Main Repository\n", "utf8");
  fs.writeFileSync(path.join(dir, "AGENTS.md"), "# Existing Hub Rules\n\nKeep me.\n", "utf8");
  fs.writeFileSync(path.join(dir, "projects", "registry.json"), "[]\n", "utf8");
  fs.writeFileSync(path.join(blueprintDir, "rules", "hub-boundaries.md"), "项目登记：{{paths.formal_source}}\n跨项目协调：{{paths.business_work_area}}\n", "utf8");
  fs.writeFileSync(path.join(blueprintDir, "upgrade-blueprint.json"), `${JSON.stringify({
    schema: "starwork.upgrade_blueprint.v0.1",
    generated_by: "starworkDoctor",
    source: {
      doctor_schema: "starwork.doctor.result.v0.1",
      diagnosis: "hub-like-main-repository",
      core_fit: "high"
    },
    base: {
      workspace_type: "hub",
      kit: "hub",
      language: "zh",
      pack: null
    },
    strategy: "preserve-names",
    paths: {
      formal_source: "projects/",
      business_work_area: "projects/coordination/"
    },
    core_role_mapping: [
      { role: "projects", path: "projects/", confidence: "high", reason: "用户确认" },
      { role: "project_registry", path: "projects/registry.json", confidence: "high", reason: "用户确认" },
      { role: "coordination", path: "projects/coordination/", confidence: "high", reason: "用户确认" },
      { role: "incoming", path: ".incoming/", confidence: "high", reason: "用户确认" },
      { role: "knowledge", path: "knowledge/", confidence: "high", reason: "用户确认" },
      { role: "identity", path: "identity/", confidence: "high", reason: "用户确认" },
      { role: "lessons", path: "lessons/", confidence: "high", reason: "用户确认" },
      { role: "skills", path: "skills/", confidence: "high", reason: "用户确认" }
    ],
    actions: [
      { type: "ensure_dir", path: ".starwork/" },
      { type: "write_workspace_state" },
      { type: "copy_kit_missing_files" },
      { type: "inject_agent_rules", target: "AGENTS.md", from: "rules/hub-boundaries.md", slot: "upgrade.hub_boundaries" }
    ],
    preserve: ["projects/", "knowledge/", "identity/", "lessons/", "skills/", ".incoming/"],
    verification: {
      run_doctor_after: true,
      expected_workspace_type: "hub"
    }
  }, null, 2)}\n`, "utf8");

  const result = runCommand(["upgrade", "--target", dir, "--blueprint", path.join(blueprintDir, "upgrade-blueprint.json"), "--yes"]);
  const state = readJson(path.join(dir, ".starwork", "workspace.json"));
  const agents = fs.readFileSync(path.join(dir, "AGENTS.md"), "utf8");
  const doctor = runDoctor(["--target", dir, "--json"]);
  const report = JSON.parse(doctor.stdout);

  assert.equal(result.status, 0);
  assert.equal(state.workspace_type, "hub");
  assert.equal(state.kit, "hub");
  assert.deepEqual(state.packs, []);
  assert.equal(state.paths.formal_source, "projects/");
  assert.equal(state.paths.business_work_area, "projects/coordination/");
  assert.equal(fs.existsSync(path.join(dir, "项目")), false);
  assert.equal(fs.existsSync(path.join(dir, "知识")), false);
  assert.match(agents, /Keep me/);
  assert.match(agents, /\.starwork\/rules\/index\.md/);
  assert.doesNotMatch(agents, /StarWork Rule Slot:/);
  assert.doesNotMatch(agents, /StarWork Upgrade:/);
  assert.equal(fs.existsSync(path.join(dir, ".starwork", "rules", "upgrade.hub_boundaries.md")), true);
  assert.equal(doctor.status, 0);
  assert.equal(report.ok, true);
  assert(report.checks.some((check) => check.id === "upgrade.role_mapping.exists" && check.level === "pass"));
});

test("upgrade refuses existing StarWork workspaces", () => {
  const dir = tempDir();
  const blueprintDir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);
  fs.writeFileSync(path.join(blueprintDir, "upgrade-blueprint.json"), `${JSON.stringify({
    schema: "starwork.upgrade_blueprint.v0.1",
    base: {
      workspace_type: "single-light",
      kit: "local-starter",
      language: "zh",
      pack: "general"
    },
    strategy: "preserve-names",
    paths: {
      formal_source: "输出/确认成果/",
      business_work_area: "输出/草稿/"
    },
    actions: [
      { type: "ensure_dir", path: ".starwork/" },
      { type: "write_workspace_state" }
    ]
  }, null, 2)}\n`, "utf8");

  const result = runCommand(["upgrade", "--target", dir, "--blueprint", path.join(blueprintDir, "upgrade-blueprint.json"), "--yes"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /已经是 StarWork 工作台/);
});

test("upgrade rejects unsafe blueprint paths", () => {
  const dir = tempDir();
  const blueprintDir = tempDir();
  fs.writeFileSync(path.join(blueprintDir, "upgrade-blueprint.json"), `${JSON.stringify({
    schema: "starwork.upgrade_blueprint.v0.1",
    base: {
      workspace_type: "single-light",
      kit: "local-starter",
      language: "zh",
      pack: "general"
    },
    strategy: "preserve-names",
    paths: {
      formal_source: "../escape/",
      business_work_area: "参考资料/"
    },
    actions: [
      { type: "ensure_dir", path: ".starwork/" },
      { type: "write_workspace_state" }
    ]
  }, null, 2)}\n`, "utf8");

  const result = runCommand(["upgrade", "--target", dir, "--blueprint", path.join(blueprintDir, "upgrade-blueprint.json"), "--yes"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /不能跳出工作区/);
});

test("adapt creates a Claude adapter and records it in workspace state", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);

  const result = runCommand(["adapt", "claude", "--target", dir, "--yes"]);
  const state = readJson(path.join(dir, ".starwork", "workspace.json"));
  const adaptersState = readJson(path.join(dir, ".starwork", "adapters.json"));
  const claude = fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8");
  const claudeAdapter = fs.readFileSync(path.join(dir, "CLAUDE.starwork.md"), "utf8");

  assert.equal(result.status, 0);
  assert.match(claude, /Claude 工作规则/);
  assert.match(claudeAdapter, /StarWork Adapter for Claude Code/);
  assert.match(claudeAdapter, /STARWORK:ADAPTER_ENTRY v0\.1 host=claude-code/);
  assert.equal(state.adapters["claude-code"].rules_entry, "CLAUDE.starwork.md");
  assert.equal(adaptersState.schema, "starwork.adapters.state.v0.1");
  assert.equal(adaptersState.adapters["claude-code"].enabled, true);
  assert.equal(adaptersState.adapters["claude-code"].rules_entry, "CLAUDE.starwork.md");
  assert.equal(adaptersState.adapters["claude-code"].capabilities["sessions.send_message"], "manual");
  assert.equal(fs.existsSync(path.join(dir, ".claude", "skills")), true);
});

test("adapt does not overwrite user-authored Claude rules that mention AGENTS", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);
  const userRules = "# My Claude Rules\n\n请先阅读 AGENTS.md，但不要覆盖我。\n";
  fs.writeFileSync(path.join(dir, "CLAUDE.md"), userRules, "utf8");

  const result = runCommand(["adapt", "claude-code", "--target", dir, "--yes"]);
  const primary = fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8");
  const sidecar = fs.readFileSync(path.join(dir, "CLAUDE.starwork.md"), "utf8");
  const workspaceState = readJson(path.join(dir, ".starwork", "workspace.json"));
  const adaptersState = readJson(path.join(dir, ".starwork", "adapters.json"));
  const doctor = runDoctor(["--target", dir, "--host", "claude-code", "--json"]);
  const report = JSON.parse(doctor.stdout);

  assert.equal(result.status, 0);
  assert.equal(primary, userRules);
  assert.match(sidecar, /STARWORK:ADAPTER_ENTRY v0\.1 host=claude-code/);
  assert.equal(adaptersState.adapters["claude-code"].rules_entry, "CLAUDE.starwork.md");
  assert.deepEqual(adaptersState.adapters["claude-code"].generated_entries, ["CLAUDE.starwork.md"]);
  assert.equal(workspaceState.adapters["claude-code"].rules_entry, "CLAUDE.starwork.md");
  assert.equal(report.adapters.checked_hosts[0].rules_entry, "CLAUDE.starwork.md");
  assert.ok(report.checks.some((check) => check.id === "adapter.claude-code.rules.skills_manifest" && check.level === "pass" && check.path === "CLAUDE.starwork.md"));
});

test("adapt can update StarWork-managed Claude rules", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);
  fs.writeFileSync(path.join(dir, "CLAUDE.md"), "# Old Adapter\n\n<!-- STARWORK:ADAPTER_ENTRY v0.1 host=claude-code -->\n", "utf8");

  const result = runCommand(["adapt", "claude-code", "--target", dir, "--yes"]);
  const primary = fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8");
  const adaptersState = readJson(path.join(dir, ".starwork", "adapters.json"));

  assert.equal(result.status, 0);
  assert.match(primary, /StarWork Adapter for Claude Code/);
  assert.equal(fs.existsSync(path.join(dir, "CLAUDE.starwork.md")), false);
  assert.equal(adaptersState.adapters["claude-code"].rules_entry, "CLAUDE.md");
});

test("adapt creates Cursor rules", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);

  const result = runCommand(["adapt", "--agent", "cursor", "--target", dir, "--yes"]);
  const cursorRule = fs.readFileSync(path.join(dir, ".cursor", "rules", "starwork.mdc"), "utf8");

  assert.equal(result.status, 0);
  assert.match(cursorRule, /alwaysApply: true/);
  assert.match(cursorRule, /AGENTS\.md/);
  assert.match(cursorRule, /\.starwork\/skills\.json/);
  assert.equal(fs.existsSync(path.join(dir, ".cursor", "skills")), true);
});

test("adapter profiles expose valid capabilities without writing files", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);

  const result = runCommand(["adapt", "all", "--capabilities", "--json", "--target", dir]);
  const payload = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.equal(payload.schema, "starwork.adapter.capabilities.v0.1");
  assert.deepEqual(payload.hosts.map((host) => host.host).sort(), ["claude-code", "codex", "cursor", "trae"]);
  assert.equal(payload.hosts.find((host) => host.host === "trae").sessions.send_message, "manual");
  assert.equal(payload.hosts.find((host) => host.host === "trae").sessions.read, "unsupported");
  assert.ok(payload.hosts.find((host) => host.host === "cursor").skills.project_mount_dirs.includes(".cursor/skills/"));
  assert.equal(fs.existsSync(path.join(dir, ".starwork", "adapters.json")), false);
});

test("adapt supports multiple host adapter state entries", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);

  const claude = runCommand(["adapt", "claude-code", "--target", dir, "--yes"]);
  const cursor = runCommand(["adapt", "cursor", "--target", dir, "--yes"]);
  const adaptersState = readJson(path.join(dir, ".starwork", "adapters.json"));

  assert.equal(claude.status, 0);
  assert.equal(cursor.status, 0);
  assert.equal(adaptersState.adapters["claude-code"].enabled, true);
  assert.equal(adaptersState.adapters.cursor.enabled, true);
  assert.equal(adaptersState.adapters.cursor.rules_entry, ".cursor/rules/starwork.mdc");
});

test("adapt --check delegates to doctor host checks without writing new adapter state", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);

  const check = runCommand(["adapt", "cursor", "--check", "--target", dir, "--json"]);
  const report = JSON.parse(check.stdout);

  assert.equal(check.status, 0);
  assert.equal(report.adapters.checked_hosts[0].host, "cursor");
  assert.equal(report.adapters.checked_hosts[0].enabled, false);
  assert.equal(fs.existsSync(path.join(dir, ".starwork", "adapters.json")), false);
});

test("doctor --host reports enabled adapter checks", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);
  runCommand(["adapt", "cursor", "--target", dir, "--yes"]);

  const doctor = runDoctor(["--target", dir, "--host", "cursor", "--json"]);
  const report = JSON.parse(doctor.stdout);

  assert.equal(doctor.status, 0);
  assert.equal(report.adapters.checked_hosts[0].host, "cursor");
  assert.ok(report.checks.some((check) => check.id === "adapter.cursor.rules.skills_manifest" && check.level === "pass"));
  assert.ok(report.checks.some((check) => check.id.startsWith("adapter.cursor.skills.mount_dir") && check.level === "pass"));
});

test("doctor --host catches Trae unsafe send_message capability state", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);
  runCommand(["adapt", "trae", "--target", dir, "--yes"]);
  const statePath = path.join(dir, ".starwork", "adapters.json");
  const state = readJson(statePath);
  state.adapters.trae.capabilities["sessions.send_message"] = "supported";
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");

  const doctor = runDoctor(["--target", dir, "--host", "trae", "--json"]);
  const report = JSON.parse(doctor.stdout);

  assert.equal(doctor.status, 1);
  assert.ok(report.checks.some((check) => check.id === "adapter.trae.capabilities.send_message" && check.level === "fail"));
});

test("adapt refuses an unhealthy workspace using the same doctor checks", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);
  fs.rmSync(path.join(dir, "AGENTS.md"));

  const result = runCommand(["adapt", "claude", "--target", dir, "--yes"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /未通过 doctor 检查/);
});

test("pack install adds content creator pack to an existing workspace", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);

  const install = runCommand(["pack", "install", "content-creator", "--target", dir, "--yes"]);
  const state = readJson(path.join(dir, ".starwork", "workspace.json"));
  const agents = fs.readFileSync(path.join(dir, "AGENTS.md"), "utf8");
  const doctor = runDoctor(["--target", dir]);

  assert.equal(install.status, 0);
  assert.deepEqual(state.packs.map((pack) => pack.id), ["general", "content-creator"]);
  assert.equal(state.paths.formal_source, "发布记录/");
  assert.equal(fs.existsSync(path.join(dir, "发布记录", "README.md")), true);
  assert.equal(fs.existsSync(path.join(dir, ".starwork", "packs", "content-creator", "templates", "content-brief.md")), true);
  assert.match(agents, /\.starwork\/rules\/index\.md/);
  assert.doesNotMatch(agents, /StarWork Rule Slot:/);
  assert.equal(fs.existsSync(path.join(dir, ".starwork", "rules", "pack.general.overview.md")), true);
  assert.equal(fs.existsSync(path.join(dir, ".starwork", "rules", "pack.content-creator.overview.md")), true);
  assert.equal(doctor.status, 0);
});

test("pack install refuses unsupported workspace types", () => {
  const dir = tempDir();
  runInit(["--type", "hub", "--target", dir, "--yes"]);

  const result = runCommand(["pack", "install", "content-creator", "--target", dir, "--yes"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /不支持工作区类型 hub/);
});

test("pack install skips already installed packs", () => {
  const dir = tempDir();
  runInit(["--type", "single-light", "--pack", "general", "--target", dir, "--yes"]);

  const result = runCommand(["pack", "install", "general", "--target", dir, "--yes"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /已安装/);
});

test("audit checks a healthy hub and project satellite", () => {
  const hub = tempDir();
  const target = tempDir();
  runInit(["--type", "hub", "--target", hub, "--yes"]);
  runCommand(["spawn", "--hub", hub, "--name", "Audit Project", "--id", "audit-project", "--target", target, "--yes"]);

  const result = runCommand(["audit", "--hub", hub, "--json"]);
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.equal(report.schema, "starwork.audit.result.v0.1");
  assert.equal(report.ok, true);
  assert.equal(report.summary.projects_checked, 1);
  assert.equal(report.projects[0].workspace_type, "project");
  assert.equal(report.projects[0].kit, "project");
  assert.equal(report.projects[0].sync_ok, true);
  assert.equal(Object.hasOwn(report, "next_steps"), false);

  const human = runCommand(["audit", "--hub", hub]);
  assert.equal(human.status, 0);
  assert.match(human.stdout, /StarWork 项目中心巡检结果/);
  assert.match(human.stdout, /项目检查结果/);
  assert.match(human.stdout, /这个项目中心和已登记项目目前结构完整，可以继续使用/);
});

test("audit reports a missing satellite path", () => {
  const hub = tempDir();
  const target = path.join(tempDir(), "missing-project");
  runInit(["--type", "hub", "--target", hub, "--yes"]);
  const registryPath = path.join(hub, "项目", "registry.json");
  const registry = readJson(registryPath);
  registry.projects.push({ id: "missing-project", name: "Missing Project", path: target, status: "active" });
  fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");

  const result = runCommand(["audit", "--hub", hub, "--json"]);
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(report.ok, false);
  assert.equal(report.projects[0].reachable, false);
  assert(report.projects[0].checks.some((check) => check.id === "satellite.path.exists" && check.level === "fail"));
});

test("repair dry-run and apply can restore satellite handoff state", () => {
  const hub = tempDir();
  const target = tempDir();
  const blueprintDir = tempDir();
  runInit(["--type", "hub", "--target", hub, "--yes"]);
  runCommand(["spawn", "--hub", hub, "--name", "Repair Project", "--id", "repair-project", "--target", target, "--yes"]);
  fs.rmSync(path.join(target, ".starwork", "handoff"), { recursive: true, force: true });
  const blueprintPath = path.join(blueprintDir, "repair-blueprint.json");
  fs.writeFileSync(blueprintPath, `${JSON.stringify({
    schema: "starwork.repair_blueprint.v0.1",
    generated_by: "starworkAudit",
    source: { audit_schema: "starwork.audit.result.v0.1", hub },
    scope: { projects: ["repair-project"] },
    actions: [
      { type: "ensure_dir", target: "satellite", project_id: "repair-project", path: ".starwork/handoff/inbox" },
      { type: "ensure_dir", target: "satellite", project_id: "repair-project", path: ".starwork/handoff/outbox" },
      { type: "ensure_dir", target: "satellite", project_id: "repair-project", path: ".starwork/handoff/sent" },
      { type: "ensure_dir", target: "satellite", project_id: "repair-project", path: ".starwork/handoff/archived" },
      { type: "write_file_if_missing", target: "satellite", project_id: "repair-project", path: ".starwork/handoff/state.json", content: JSON.stringify({ schema: "starwork.handoff.state.v0.1" }, null, 2) + "\n" }
    ]
  }, null, 2)}\n`, "utf8");

  const dryRun = runCommand(["repair", "--blueprint", blueprintPath, "--dry-run"]);
  assert.equal(dryRun.status, 0);
  assert.equal(fs.existsSync(path.join(target, ".starwork", "handoff", "state.json")), false);

  const apply = runCommand(["repair", "--blueprint", blueprintPath, "--yes"]);
  assert.equal(apply.status, 0);
  assert.equal(fs.existsSync(path.join(target, ".starwork", "handoff", "state.json")), true);
});
