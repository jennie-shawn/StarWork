const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { spawn, spawnSync } = require("child_process");

const PRODUCT_ROOT = path.resolve(__dirname, "..", "..");
const PACKAGE_VERSION = require(path.join(PRODUCT_ROOT, "package.json")).version;
const STARWORK_RULES_DIR = path.join(".starwork", "rules");
const STARWORK_RULES_INDEX = path.join(STARWORK_RULES_DIR, "index.md");
const STARWORK_RULES_MANIFEST = path.join(STARWORK_RULES_DIR, "manifest.json");
const KNOWLEDGE_PROJECT_SKILL_ID = "starworkKnowledgeProject";
const KNOWLEDGE_PROJECT_SKILL_SOURCE = path.join("core", "capabilities", "knowledge", "skills", KNOWLEDGE_PROJECT_SKILL_ID);
const KNOWLEDGE_BLUEPRINT_ACTIONS = new Set([
  "create_knowledge_base",
  "create_dir",
  "write_template",
  "append_agents_rule",
  "install_project_skill",
  "copy_preserved_file",
  "record_workspace_capability"
]);
const KNOWLEDGE_BLUEPRINT_BANNED_ACTIONS = new Set([
  "delete",
  "rename_without_preserve",
  "summarize_source",
  "generate_page_content",
  "promote_to_project_center"
]);

const WORKSPACE_TYPES = {
  project: {
    label: "项目工作台",
    kit: "project",
    defaultPack: "general",
    description: "适合具体项目执行；可独立使用，也可加入项目中心。"
  },
  "single-light": {
    label: "项目工作台",
    kit: "project",
    defaultPack: "general",
    description: "兼容别名：等同于 project。"
  },
  hub: {
    label: "项目中心",
    kit: "hub",
    defaultPack: "hub-management",
    description: "适合统一管理身份、教训、知识、skills 和多个项目。"
  }
};

const SPAWN_MODES = {
  project: {
    label: "项目工作台",
    workspaceType: "project",
    kit: "project",
    formalSource: "输出/确认成果/",
    businessWorkArea: "输出/草稿/"
  },
  starter: {
    label: "轻量项目",
    workspaceType: "project",
    kit: "project",
    formalSource: "输出/确认成果/",
    businessWorkArea: "输出/草稿/"
  }
};

const SPAWN_MODE_LANGUAGE_OVERRIDES = {
  en: {
    project: {
      label: "Project workspace",
      formalSource: "outputs/final/",
      businessWorkArea: "outputs/drafts/"
    },
    starter: {
      label: "Project workspace",
      formalSource: "outputs/final/",
      businessWorkArea: "outputs/drafts/"
    }
  }
};

const HUB_STANDARD_PATHS = {
  identity: "identity/",
  lessons: "lessons/",
  projectRegistry: "projects/registry.json",
  coordination: "projects/coordination/",
  localHandoff: ".starwork/handoff/",
  incoming: ".incoming/",
  formalSkills: "skills/",
  draftsAndExperiments: "workspace/",
  knowledge: "knowledge/"
};

const HUB_LANGUAGE_PATHS = {
  zh: {
    identity: "身份/",
    lessons: "教训/",
    projectRegistry: "项目/registry.json",
    coordination: "项目/协作/",
    localHandoff: ".starwork/handoff/",
    incoming: ".incoming/",
    formalSkills: "技能/",
    draftsAndExperiments: "工作区/",
    knowledge: "知识/"
  },
  en: HUB_STANDARD_PATHS
};

const PACK_LABELS = {
  general: "通用工作",
  "content-creator": "自媒体内容创作",
  "hub-management": "项目中心管理"
};

const ADAPTERS = {
  codex: {
    profile: path.join("adapters", "codex", "profile.json")
  },
  "claude-code": {
    profile: path.join("adapters", "claude-code", "profile.json")
  },
  cursor: {
    profile: path.join("adapters", "cursor", "profile.json")
  },
  trae: {
    profile: path.join("adapters", "trae", "profile.json")
  }
};

const ADAPTER_ALIASES = {
  codex: "codex",
  claude: "claude-code",
  "claude-code": "claude-code",
  cursor: "cursor",
  trae: "trae"
};

const ADAPTER_CAPABILITY_LEVELS = new Set(["supported", "partial", "manual", "unsupported", "unknown"]);
const ADAPTER_STATE_SCHEMA = "starwork.adapters.state.v0.1";
const ADAPTER_ENTRY_MARKER = "STARWORK:ADAPTER_ENTRY v0.1";
const AGENT_DOCS_PLAN_SCHEMA = "starwork.agent_docs_plan.v0.1";
const AGENT_DOCS_DRAFT_DIR = path.join(".starwork", "drafts");
const LEGACY_AGENT_DOC_SIDECARS = ["AGENTS.starwork.md", "AGENTS.starwork-new.md", "README.starwork-new.md", "CLAUDE.starwork.md"];
const MANUAL_HANDOFF_STATUS = "manual_handoff_required";
const HOST_DELIVERY_STATUSES = new Set([
  "delivered",
  "delivered_via_codex_thread_tool",
  "delivered_via_claude_code_session_tool",
  "recorded_only",
  MANUAL_HANDOFF_STATUS,
  "failed"
]);
const WORKFLOW_RUN_SCHEMA = "starwork.multiagent.workflow_run.v0.1";
const WORKFLOW_ROUTE_SCHEMA = "starwork.multiagent.workflow_route.v0.1";
const WORKFLOW_RUN_STATUSES = new Set([
  "planned",
  "ready",
  "delivering",
  "delivered",
  "blocked_self_delivery",
  "manual_confirmation_required",
  "blocked_missing_route",
  MANUAL_HANDOFF_STATUS,
  "self_step_recorded",
  "completed",
  "failed"
]);

const KIT_BUNDLED_SKILLS = {
  hub: [
    {
      id: "starworkSpawn",
      name: "StarWork Spawn",
      source: path.join("kit-skills", "starworkSpawn"),
      sourceKind: "kit",
      type: "kit-bundled",
      distribution: "copy",
      reason: "项目中心自带：用于从项目中心创建和定制项目工作台。",
      install: [
        { agent: "hub", path: path.join("skills", "starworkSpawn"), mode: "copy" },
        { agent: "codex", path: path.join(".agents", "skills", "starworkSpawn"), mode: "symlink", source: path.join("skills", "starworkSpawn") },
        { agent: "claude", path: path.join(".claude", "skills", "starworkSpawn"), mode: "symlink", source: path.join("skills", "starworkSpawn") }
      ]
    },
    {
      id: "starworkAudit",
      name: "StarWork Audit",
      source: path.join("kit-skills", "starworkAudit"),
      sourceKind: "kit",
      type: "kit-bundled",
      distribution: "copy",
      reason: "项目中心自带：用于巡检和修复中心管理的项目工作台。",
      install: [
        { agent: "hub", path: path.join("skills", "starworkAudit"), mode: "copy" },
        { agent: "codex", path: path.join(".agents", "skills", "starworkAudit"), mode: "symlink", source: path.join("skills", "starworkAudit") },
        { agent: "claude", path: path.join(".claude", "skills", "starworkAudit"), mode: "symlink", source: path.join("skills", "starworkAudit") }
      ]
    }
  ],
  project: [
    {
      id: "neat-freak",
      name: "Neat Freak",
      source: path.join("kit-skills", "neat-freak"),
      sourceKind: "kit",
      type: "kit-bundled",
      distribution: "copy",
      reason: "项目工作台自带：用于阶段性清理、收尾和归档。",
      install: [
        { agent: "codex", path: path.join(".agents", "skills", "neat-freak"), mode: "copy" },
        { agent: "claude", path: path.join(".claude", "skills", "neat-freak"), mode: "copy" }
      ]
    }
  ],
};

async function run(argv) {
  const command = argv[0];
  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "--version" || command === "-v" || command === "version") {
    printVersion();
    return;
  }

  if (command === "init") {
    await init(argv.slice(1));
    return;
  }

  if (command === "doctor") {
    const result = doctor(argv.slice(1));
    process.exitCode = result.exitCode;
    return;
  }

  if (command === "knowledge") {
    await knowledgeCommand(argv.slice(1));
    return;
  }

  if (command === "spawn") {
    await spawnWorkspace(argv.slice(1));
    return;
  }

  if (command === "audit") {
    const result = audit(argv.slice(1));
    process.exitCode = result.exitCode;
    return;
  }

  if (command === "repair") {
    await repairWorkspace(argv.slice(1));
    return;
  }

  if (command === "upgrade") {
    await upgradeWorkspace(argv.slice(1));
    return;
  }

  if (command === "adapt") {
    await adapt(argv.slice(1));
    return;
  }

  if (command === "pack") {
    await packCommand(argv.slice(1));
    return;
  }

  if (command === "multiagent") {
    await lanesCommand(argv.slice(1));
    return;
  }

  throw new Error(`未知命令：${command}`);
}

async function init(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printInitHelp();
    return;
  }
  const targetDir = path.resolve(options.target || process.cwd());
  const blueprint = options.blueprint ? loadInitBlueprint(options.blueprint) : null;

  if (findWorkspaceRoot(targetDir)) {
    console.log("当前目录看起来已经位于 StarWork 工作台内。");
    console.log("你可以运行 starwork doctor 检查状态；v0.1 的 init 暂不处理升级。");
    return;
  }

  printInitIntro(options, targetDir);
  const requestedWorkspaceType = options.type || blueprint?.workspace_type || await chooseWorkspaceType(options);
  const workspaceType = normalizeWorkspaceType(requestedWorkspaceType);
  warnDeprecatedWorkspaceType(requestedWorkspaceType, workspaceType);
  const workspaceConfig = WORKSPACE_TYPES[workspaceType];
  if (!workspaceConfig) {
    throw new Error(`不支持的工作区类型：${requestedWorkspaceType}`);
  }
  validateInitBlueprintForWorkspace(blueprint, workspaceType, workspaceConfig);

  const language = options.language || blueprint?.language || await chooseLanguage(options);
  validateLanguage(language);
  const packId = options.pack || blueprint?.pack || await choosePack(workspaceType, workspaceConfig, options);
  const pack = loadPack(packId, language);
  validatePack(pack, workspaceType);

  const workspaceName = options.name || blueprint?.name || path.basename(targetDir);
  const formalSource = options.formalSource || blueprint?.paths?.formal_source || pack.overrides?.formal_source || getKitDefaultFormalSource(workspaceConfig.kit);
  const businessWorkArea = blueprint?.paths?.business_work_area || pack.overrides?.business_work_area || formalSource;
  const agentDocsMode = normalizeAgentDocsMode(options.agentDocs);

  const plan = buildInitPlan({
    targetDir,
    workspaceName,
    workspaceType,
    workspaceConfig,
    pack,
    formalSource,
    businessWorkArea,
    blueprint,
    includeSkills: !options.noSkills,
    enableKnowledge: Boolean(options.knowledge),
    agentDocsMode
  });

  const adapterHosts = options.adapter ? resolveAdapterHosts(options.adapter) : [];
  const dryRunAdapterPlan = adapterHosts.length
    ? buildAdaptPlan({
      workspaceRoot: targetDir,
      state: plan.workspaceState,
      hosts: adapterHosts,
      agentDocsMode,
      agentDocsEntriesSeed: plan.agentDocs?.entries || []
    })
    : null;

  if (options.json && options.dryRun) {
    console.log(JSON.stringify(renderInitPlanJson(plan, true), null, 2));
    return;
  }

  printPlan(plan, options.dryRun);
  if (adapterHosts.length && options.dryRun) {
    console.log("");
    console.log(`初始化完成后将继续适配 AI 工具：${adapterHosts.join(", ")}。`);
    printGenericPlan("初始化后的 AI 工具适配预览（dry run）：", dryRunAdapterPlan.actions);
    if (dryRunAdapterPlan.agentDocs?.status === "draft_required") {
      console.log("AI 入口文档状态：pending_merge；需由 starworkInit 整合 .starwork/drafts/ 草稿后再生效。");
    }
  }

  if (options.dryRun) {
    return;
  }

  if (!options.yes && process.stdin.isTTY) {
    const ok = await confirm("是否执行初始化？", true);
    if (!ok) {
      console.log("已取消，没有写入任何文件。");
      return;
    }
  } else if (!options.yes && !process.stdin.isTTY) {
    throw new Error("非交互环境需要传入 --yes 或 --dry-run。");
  }

  applyPlan(plan);
  if (adapterHosts.length) {
    const createdState = readWorkspaceState(targetDir);
    const adapterPlan = buildAdaptPlan({ workspaceRoot: targetDir, state: createdState, hosts: adapterHosts, agentDocsMode });
    applyPlan(adapterPlan);
  }
  console.log("");
  console.log("StarWork 工作台已经创建好了。");
  console.log("");
  console.log("这次写入的是项目协作文件，不是业务代码。");
  console.log("健康检查可以确认 AI 后续能找到项目说明、当前任务和协作规则。");
  console.log("");
  console.log("下一步建议：");
  console.log(`1. 运行 starwork doctor --target ${plan.targetDir}`);
  if (workspaceType === "hub") {
    console.log("2. 打开 README.md 和 AGENTS.md，确认这个项目中心的管理边界。");
    console.log("3. 需要创建项目时，先用 starworkSpawn 设计，或直接运行 starwork spawn。");
    console.log("4. 创建项目后，运行 starwork audit 巡检项目中心里的项目登记。");
  } else {
    if (hasAgentDocsDrafts(targetDir)) {
      console.log("2. 还有一步没有自动完成：你的项目已经有 AI 规则文件，所以 StarWork 只生成了待整合草稿，没有直接覆盖原文件。");
      console.log("3. AI 入口文档需要 Skill 整合后再生效；请用 starworkInit 读取 .starwork/drafts/agent-docs-plan.json 和 proposed 草稿，确认后再合并最终入口。");
    } else {
      console.log("2. 打开 AGENTS.md，确认 AI 入口规则。");
    }
    if (adapterHosts.length) {
      console.log(`4. 已生成 ${adapterHosts.join(", ")} 适配入口；运行 starwork doctor --target ${plan.targetDir} --host ${adapterHosts.length === 1 ? adapterHosts[0] : "all"} 再检查一次。`);
    } else {
      console.log("3. 下一步你可以用 Codex / Claude Code / Cursor 打开这个目录，让 AI 先读项目规则。");
    }
  }
}

async function spawnWorkspace(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printSpawnHelp();
    return;
  }
  if (options.pack) {
    throw new Error("spawn v0.1 暂不支持 --pack。请先创建项目，再运行 starwork pack install。");
  }
  if (!options.target) {
    throw new Error("spawn 需要指定 --target <path>，避免误把新项目写进当前目录。");
  }

  const hubRoot = resolveHubRoot(options.hub || process.cwd());
  const hubState = readWorkspaceState(hubRoot);
  assertHealthyHub(hubRoot, hubState);

  const blueprint = options.blueprint ? loadSpawnBlueprint(options.blueprint) : null;
  const projectName = options.name || blueprint?.name || path.basename(path.resolve(options.target || process.cwd()));
  const targetDir = path.resolve(options.target || path.join(process.cwd(), slugifyProjectId(projectName) || "project"));
  assertSpawnTargetIsEmpty(targetDir);

  const requestedMode = options.mode || blueprint?.base?.mode || "project";
  const mode = normalizeSpawnMode(requestedMode);
  warnDeprecatedSpawnMode(requestedMode, mode);
  const language = options.language || blueprint?.base?.language || hubState.language || "zh";
  validateLanguage(language);
  const baseModeConfig = getSpawnModeConfig(mode, language);
  if (!baseModeConfig) {
    throw new Error(`不支持的 spawn 模式：${requestedMode}。可选值：project。`);
  }
  validateSpawnBlueprintForMode(blueprint, requestedMode, mode, baseModeConfig);
  const modeConfig = applySpawnBlueprintModeConfig(baseModeConfig, blueprint);

  const status = options.status || "active";
  if (!["active", "paused"].includes(status)) {
    throw new Error("--status 只支持 active 或 paused。");
  }

  const projectId = options.id || blueprint?.project_id || slugifyProjectId(projectName) || slugifyProjectId(path.basename(targetDir)) || "project";
  const plan = buildSpawnPlan({
    hubRoot,
    hubState,
    targetDir,
    projectName,
    projectId,
    status,
    mode,
    language,
    modeConfig,
    blueprint
  });

  printSpawnPlan(plan, options.dryRun);
  if (options.dryRun) return;

  await confirmOrThrow(options, "是否从项目中心创建新项目工作台？");
  applyPlan(plan);
  console.log("");
  console.log("StarWork 项目工作台已生成。");
  console.log("");
  console.log("下一步建议：");
  console.log(`1. 运行 starwork doctor --target ${plan.targetDir}`);
  const rolePaths = getCoreRolePaths({ workspace_type: modeConfig.workspaceType, kit: modeConfig.kit, language });
  console.log(`2. 打开 ${rolePaths.projectStatus}，补充项目目标和近期重点。`);
}

function audit(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printAuditHelp();
    return { exitCode: 0 };
  }
  const result = collectAuditResult(options);
  if (options.json) {
    console.log(JSON.stringify(auditPublicResult(result), null, 2));
  } else {
    printAuditResult(result);
  }
  return result;
}

function collectAuditResult(options = {}) {
  const hubTarget = path.resolve(options.hub || process.cwd());
  const result = {
    schema: "starwork.audit.result.v0.1",
    ok: false,
    strict_ok: false,
    hub: {
      path: hubTarget,
      ok: false,
      workspace: null,
      doctor: null
    },
    registry: {
      path: null,
      ok: false,
      projects_total: 0,
      duplicate_ids: [],
      missing_paths: []
    },
    summary: {
      projects_total: 0,
      projects_checked: 0,
      projects_reachable: 0,
      pass: 0,
      info: 0,
      warn: 0,
      fail: 0
    },
    projects: [],
    checks: [],
    exitCode: 1
  };

  let hubRoot;
  try {
    hubRoot = resolveHubRoot(hubTarget);
  } catch (error) {
    auditAddCheck(result, "hub.workspace.exists", "fail", error.message, hubTarget);
    return finalizeAuditResult(result, options);
  }
  result.hub.path = hubRoot;

  let hubState;
  try {
    hubState = readWorkspaceState(hubRoot);
  } catch (error) {
    auditAddCheck(result, "hub.workspace_state.parse", "fail", error.message, ".starwork/workspace.json");
    return finalizeAuditResult(result, options);
  }
  result.hub.workspace = {
    core: hubState.core || null,
    workspace_type: hubState.workspace_type || null,
    kit: hubState.kit || null,
    language: hubState.language || null
  };
  if (hubState.workspace_type === "hub" && hubState.kit === "hub") {
    auditAddCheck(result, "hub.workspace_type", "pass", "Project Center workspace state is valid", ".starwork/workspace.json");
  } else {
    auditAddCheck(result, "hub.workspace_type", "fail", "audit 必须从项目中心执行。", ".starwork/workspace.json");
    return finalizeAuditResult(result, options);
  }

  const hubDoctor = doctorCollect(hubRoot);
  result.hub.doctor = {
    ok: hubDoctor.ok,
    summary: hubDoctor.summary
  };
  result.hub.ok = hubDoctor.ok;
  auditAddCheck(result, "hub.doctor", hubDoctor.ok ? "pass" : "fail", hubDoctor.ok ? "Project Center doctor passed" : "Project Center doctor has blocking issues", hubRoot);

  const hubPaths = getHubPaths(hubState);
  const registryRelativePath = hubPaths.projectRegistry;
  result.registry.path = registryRelativePath;
  const registryPath = path.join(hubRoot, registryRelativePath);
  const registryRead = readProjectRegistryTolerant(registryPath);
  if (!registryRead.ok) {
    auditAddCheck(result, "registry.parse", "fail", registryRead.error, registryRelativePath);
    return finalizeAuditResult(result, options);
  }
  result.registry.ok = true;
  const allProjects = Array.isArray(registryRead.registry.projects) ? registryRead.registry.projects : [];
  result.registry.projects_total = allProjects.length;
  result.summary.projects_total = allProjects.length;
  const duplicateIds = findDuplicateProjectIds(allProjects);
  result.registry.duplicate_ids = duplicateIds;
  if (duplicateIds.length) {
    auditAddCheck(result, "registry.duplicate_ids", "fail", `项目 ID 重复：${duplicateIds.join(", ")}`, registryRelativePath);
  } else {
    auditAddCheck(result, "registry.duplicate_ids", "pass", "No duplicate project ids", registryRelativePath);
  }

  const projects = options.project
    ? allProjects.filter((project) => getRegistryProjectId(project) === options.project)
    : allProjects;
  if (options.project && projects.length === 0) {
    auditAddCheck(result, "registry.project.exists", "fail", `项目中心登记表中不存在项目：${options.project}`, registryRelativePath);
    return finalizeAuditResult(result, options);
  }

  for (const project of projects) {
    result.projects.push(collectAuditProjectResult({ hubRoot, hubState, registryProject: project, options }));
  }

  result.summary.projects_checked = result.projects.length;
  result.summary.projects_reachable = result.projects.filter((project) => project.reachable).length;
  for (const project of result.projects) {
    for (const check of project.checks) {
      if (result.summary[check.level] != null) result.summary[check.level] += 1;
    }
  }
  return finalizeAuditResult(result, options);
}

function collectAuditProjectResult({ hubRoot, registryProject, options }) {
  const projectId = getRegistryProjectId(registryProject);
  const projectPath = registryProject?.path ? path.resolve(registryProject.path) : null;
  const result = {
    project_id: projectId || null,
    name: registryProject?.name || projectId || null,
    status: registryProject?.status || "unknown",
    path: projectPath,
    reachable: false,
    workspace_type: null,
    kit: null,
    language: null,
    doctor_ok: false,
    sync_ok: false,
    checks: [],
    legacy_signals: []
  };
  if (!projectId) {
    auditAddProjectCheck(result, "registry.project_id.exists", "fail", "项目记录缺少 id。");
  }
  if (!projectPath) {
    auditAddProjectCheck(result, "satellite.path.exists", "fail", "项目记录缺少 path。");
    return result;
  }
  if (!fs.existsSync(projectPath) || !fs.statSync(projectPath).isDirectory()) {
    auditAddProjectCheck(result, "satellite.path.exists", "fail", `项目目录不存在或不是目录：${projectPath}`, projectPath);
    return result;
  }
  result.reachable = true;
  auditAddProjectCheck(result, "satellite.path.exists", "pass", "Project workspace path exists", projectPath);

  let state;
  try {
    state = readWorkspaceState(projectPath);
  } catch (error) {
    auditAddProjectCheck(result, "satellite.workspace_state.parse", "fail", error.message, ".starwork/workspace.json");
    return result;
  }
  result.workspace_type = state.workspace_type || null;
  result.kit = state.kit || null;
  result.language = state.language || "zh";
  const projectCenter = getProjectCenterBinding(state);
  if (state.workspace_type === "project" && state.kit === "project" && projectCenter?.project_id) {
    auditAddProjectCheck(result, "satellite.binding.exists", "pass", "Project has Project Center connection", ".starwork/workspace.json");
  } else if (state.workspace_type === "satellite-starter") {
    result.legacy_signals.push(state.workspace_type);
    auditAddProjectCheck(result, "satellite.legacy_type", "warn", `检测到旧的中心管理项目类型：${state.workspace_type}`, ".starwork/workspace.json");
  } else {
    auditAddProjectCheck(result, "satellite.binding.exists", "fail", "中心管理的项目工作台应为 project workspace，并带 project_center 连接信息。", ".starwork/workspace.json");
  }
  if (projectCenter?.project_id === projectId) {
    auditAddProjectCheck(result, "satellite.project_id.match", "pass", "Project Center project id matches registry", ".starwork/workspace.json");
  } else {
    auditAddProjectCheck(result, "satellite.project_id.match", "warn", "项目中心连接里的 project_id 与登记表 ID 不一致。", ".starwork/workspace.json");
  }
  if (projectCenter?.path && path.resolve(projectCenter.path) === path.resolve(hubRoot)) {
    auditAddProjectCheck(result, "satellite.hub_path.match", "pass", "Project Center path matches", ".starwork/workspace.json");
  } else {
    auditAddProjectCheck(result, "satellite.hub_path.match", "warn", "项目中心连接路径未指向当前项目中心。", ".starwork/workspace.json");
  }

  const sync = readSyncState(projectPath);
  if (sync.ok && sync.data?.project_id === projectId && sync.data?.hub_path && path.resolve(sync.data.hub_path) === path.resolve(hubRoot)) {
    result.sync_ok = true;
    auditAddProjectCheck(result, "satellite.sync.match", "pass", `Sync metadata matches (${sync.source})`, sync.source);
  } else {
    auditAddProjectCheck(result, "satellite.sync.match", "warn", sync.ok ? "同步信息与项目中心登记表不一致。" : sync.error, sync.source || ".starwork/sync.json");
  }

  const doctor = doctorCollect(projectPath);
  result.doctor_ok = doctor.ok;
  auditAddProjectCheck(result, "satellite.doctor", doctor.ok ? "pass" : "fail", doctor.ok ? "Project workspace doctor passed" : "Project workspace doctor has blocking issues", projectPath);
  result.doctor = {
    ok: doctor.ok,
    summary: doctor.summary
  };

  checkAuditProjectPath(result, projectPath, ".starwork/handoff/state.json", "satellite.handoff.exists", "Local handoff state exists");
  if (fs.existsSync(path.join(projectPath, "_系统", "跨项目")) || fs.existsSync(path.join(projectPath, "_system", "cross-project"))) {
    result.legacy_signals.push("legacy-local-handoff");
    auditAddProjectCheck(result, "satellite.legacy_handoff", "warn", "检测到旧跨项目本地联络路径。", "_系统/跨项目");
  }
  return result;
}

function repairWorkspace(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printRepairHelp();
    return;
  }
  if (!options.blueprint) {
    throw new Error("repair 需要 --blueprint <repair-blueprint.json>。");
  }
  const blueprint = loadRepairBlueprint(options.blueprint);
  const plan = buildRepairPlan(blueprint);
  if (options.json) {
    console.log(JSON.stringify(repairPlanResult(plan, options.dryRun), null, 2));
  } else {
    printGenericPlan(options.dryRun ? "修复预览（dry run）：" : "修复计划：", plan.actions);
  }
  if (options.dryRun) return;
  return confirmOrThrow(options, "是否按修复方案执行？").then(() => {
    applyPlan(plan);
    console.log("");
    console.log("StarWork 修复已执行。建议重新运行 starwork audit。");
  });
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--yes" || arg === "-y") {
      options.yes = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--strict") {
      options.strict = true;
    } else if (arg === "--verbose") {
      options.verbose = true;
    } else if (arg === "--host") {
      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
        options.host = readValue(argv, ++i, arg);
      } else {
        options.host = true;
      }
    } else if (arg === "--load") {
      options.load = true;
    } else if (arg === "--pin") {
      options.pin = true;
    } else if (arg === "--include-turns") {
      options.includeTurns = true;
    } else if (arg === "--no-skills") {
      options.noSkills = true;
    } else if (arg === "--knowledge") {
      options.knowledge = true;
    } else if (arg === "--capabilities") {
      options.capabilities = true;
    } else if (arg === "--manual-handoff") {
      options.manualHandoff = true;
    } else if (arg === "--check") {
      options.check = true;
    } else if (arg === "--adapter") {
      options.adapter = readValue(argv, ++i, arg);
    } else if (arg === "--agent-docs") {
      options.agentDocs = readValue(argv, ++i, arg);
    } else if (arg === "--transcript") {
      options.transcript = readValue(argv, ++i, arg);
    } else if (arg === "--inventory-depth") {
      options.inventoryDepth = readValue(argv, ++i, arg);
    } else if (arg === "--inventory-limit") {
      options.inventoryLimit = readValue(argv, ++i, arg);
    } else if (arg === "--agent") {
      options.agent = readValue(argv, ++i, arg);
    } else if (arg === "--hub") {
      options.hub = readValue(argv, ++i, arg);
    } else if (arg === "--project") {
      options.project = readValue(argv, ++i, arg);
    } else if (arg === "--blueprint") {
      options.blueprint = readValue(argv, ++i, arg);
    } else if (arg === "--mode") {
      options.mode = readValue(argv, ++i, arg);
    } else if (arg === "--id") {
      options.id = readValue(argv, ++i, arg);
    } else if (arg === "--status") {
      options.status = readValue(argv, ++i, arg);
    } else if (arg === "--definition") {
      options.definition = readValue(argv, ++i, arg);
    } else if (arg === "--entry-node") {
      options.entryNode = readValue(argv, ++i, arg);
    } else if (arg === "--actor-lane") {
      options.actorLane = readValue(argv, ++i, arg);
    } else if (arg === "--run") {
      options.run = readValue(argv, ++i, arg);
    } else if (arg === "--event") {
      options.event = readValue(argv, ++i, arg);
    } else if (arg === "--current-session") {
      options.currentSession = readValue(argv, ++i, arg);
    } else if (arg === "--lanes") {
      options.lanes = readValue(argv, ++i, arg);
    } else if (arg === "--purpose") {
      options.purpose = readValue(argv, ++i, arg);
    } else if (arg === "--write") {
      options.write = readValue(argv, ++i, arg);
    } else if (arg === "--session") {
      options.session = readValue(argv, ++i, arg);
    } else if (arg === "--session-name") {
      options.sessionName = readValue(argv, ++i, arg);
    } else if (arg === "--from") {
      options.from = readValue(argv, ++i, arg);
    } else if (arg === "--to") {
      options.to = readValue(argv, ++i, arg);
    } else if (arg === "--message") {
      options.message = readValue(argv, ++i, arg);
    } else if (arg === "--delivery-tool") {
      options.deliveryTool = readValue(argv, ++i, arg);
    } else if (arg === "--host-delivery") {
      options.hostDelivery = readValue(argv, ++i, arg);
    } else if (arg === "--turns") {
      options.turns = readValue(argv, ++i, arg);
    } else if (arg === "--timeout") {
      options.timeout = readValue(argv, ++i, arg);
    } else if (arg === "--wait" || arg === "--wait-completion") {
      options.waitCompletion = true;
    } else if (arg === "--title") {
      options.title = readValue(argv, ++i, arg);
    } else if (arg === "--path") {
      options.path = readValue(argv, ++i, arg);
    } else if (arg === "--audience") {
      options.audience = readValue(argv, ++i, arg);
    } else if (arg === "--type") {
      options.type = readValue(argv, ++i, arg);
    } else if (arg === "--pack") {
      options.pack = readValue(argv, ++i, arg);
    } else if (arg === "--name") {
      options.name = readValue(argv, ++i, arg);
    } else if (arg === "--formal-source") {
      options.formalSource = readValue(argv, ++i, arg);
    } else if (arg === "--language") {
      options.language = readValue(argv, ++i, arg);
    } else if (arg === "--target") {
      options.target = readValue(argv, ++i, arg);
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (!arg.startsWith("-")) {
      if (!options._) options._ = [];
      options._.push(arg);
    } else {
      throw new Error(`未知参数：${arg}`);
    }
  }
  return options;
}

async function adapt(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printAdaptHelp();
    return;
  }

  const hostInput = options.agent || options._?.[0] || "codex";
  const hosts = resolveAdapterHosts(hostInput);

  if (options.capabilities) {
    const capabilities = collectAdapterCapabilities(hosts);
    if (options.json) {
      console.log(JSON.stringify(capabilities, null, 2));
    } else {
      printAdapterCapabilities(capabilities);
    }
    return;
  }
  if (options.check) {
    const targetDir = path.resolve(options.target || process.cwd());
    const host = hosts.length === 1 ? hosts[0] : "all";
    const result = collectDoctorResult(targetDir, { ...options, host });
    const finished = finishDoctor(result, options);
    process.exitCode = finished.exitCode;
    return;
  }

  const targetDir = path.resolve(options.target || process.cwd());
  const workspaceRoot = requireWorkspaceRoot(targetDir);
  const state = readWorkspaceState(workspaceRoot);

  const health = doctorCollect(workspaceRoot);
  if (health.summary.fail > 0) {
    throw new Error("当前工作台未通过 doctor 检查，请先修复阻塞问题。");
  }

  const plan = buildAdaptPlan({ workspaceRoot, state, hosts, agentDocsMode: normalizeAgentDocsMode(options.agentDocs) });
  printGenericPlan(options.dryRun ? "适配预览（dry run）：" : "适配计划：", plan.actions);

  if (options.dryRun) return;
  await confirmOrThrow(options, "是否执行适配？");
  applyPlan(plan);
  console.log("");
  if (plan.agentDocs?.status === "draft_required") {
    console.log("StarWork Agent 适配草稿已生成，AI 入口文档需要 Skill 整合后再生效。");
  } else {
    console.log("StarWork Agent 适配已完成。");
  }
  console.log(`下一步建议：运行 starwork doctor --host ${hosts.length === 1 ? hosts[0] : "all"} 再检查一次宿主适配。`);
}

async function packCommand(argv) {
  const subcommand = argv[0];
  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    printPackHelp();
    return;
  }
  if (subcommand !== "install") {
    throw new Error(`未知 pack 子命令：${subcommand}`);
  }
  await packInstall(argv.slice(1));
}

async function lanesCommand(argv) {
  const subcommand = argv[0];
  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    printLanesHelp();
    return;
  }

  if (subcommand === "init") {
    await lanesInit(argv.slice(1));
    return;
  }
  if (subcommand === "add") {
    await lanesAdd(argv.slice(1));
    return;
  }
  if (subcommand === "bind") {
    await lanesBind(argv.slice(1));
    return;
  }
  if (subcommand === "release") {
    await lanesRelease(argv.slice(1));
    return;
  }
  if (subcommand === "status") {
    await lanesStatus(argv.slice(1));
    return;
  }
  if (subcommand === "upgrade") {
    await lanesUpgrade(argv.slice(1));
    return;
  }
  if (subcommand === "read") {
    await lanesRead(argv.slice(1));
    return;
  }
  if (subcommand === "instruct") {
    await lanesInstruct(argv.slice(1));
    return;
  }
  if (subcommand === "handoff") {
    await lanesHandoff(argv.slice(1));
    return;
  }
  if (subcommand === "continue") {
    await lanesContinue(argv.slice(1));
    return;
  }
  if (subcommand === "launch") {
    await lanesLaunch(argv.slice(1));
    return;
  }
  if (subcommand === "message") {
    await lanesMessage(argv.slice(1));
    return;
  }
  if (subcommand === "request") {
    await lanesRequest(argv.slice(1));
    return;
  }
  if (subcommand === "workflow") {
    await lanesWorkflow(argv.slice(1));
    return;
  }
  if (subcommand === "share") {
    await lanesShare(argv.slice(1));
    return;
  }

  throw new Error(`未知 multiagent 子命令：${subcommand}`);
}

async function lanesWorkflow(argv) {
  const subcommand = argv[0];
  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    printLanesWorkflowHelp();
    return;
  }
  if (subcommand === "start") {
    await lanesWorkflowStart(argv.slice(1));
    return;
  }
  if (subcommand === "status") {
    await lanesWorkflowStatus(argv.slice(1));
    return;
  }
  if (subcommand === "route") {
    await lanesWorkflowRoute(argv.slice(1));
    return;
  }
  if (subcommand === "event") {
    if (argv[1] === "record") {
      await lanesWorkflowEventRecord(argv.slice(2));
      return;
    }
    throw new Error(`未知 multiagent workflow event 子命令：${argv[1] || "(empty)"}`);
  }
  throw new Error(`未知 multiagent workflow 子命令：${subcommand}`);
}

async function lanesInit(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printLanesInitHelp();
    return;
  }
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
  assertAgentDocsReadyForMultiagent(workspaceRoot);
  assertMultiagentWritable(workspaceRoot);
  const lanes = parseLaneList(options.lanes || "").map((id) => ({
    lane: id,
    purpose: "待补充",
    current_session: "unbound",
    write_scope: "待补充",
    worklog: defaultLaneWorklogPath(id),
    workspace: defaultLaneWorkspacePath(id)
  }));
  const plan = buildLanesInitPlan({ workspaceRoot, lanes });
  printGenericPlan(options.dryRun ? "Agent Lanes 初始化预览（dry run）：" : "Agent Lanes 初始化计划：", plan.actions);
  if (options.dryRun) return;
  await confirmOrThrow(options, "是否初始化 Agent Lanes？");
  applyPlan(plan);
  console.log("");
  console.log("Agent Lanes 已初始化。");
}

async function lanesAdd(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printLanesAddHelp();
    return;
  }
  const laneId = normalizeLaneId(options._?.[0], "lane");
  if (!options.purpose) {
    throw new Error("multiagent add 需要 --purpose <text>。");
  }
  if (!options.write) {
    throw new Error("multiagent add 需要 --write <path-globs>。");
  }
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
  assertAgentDocsReadyForMultiagent(workspaceRoot);
  assertMultiagentWritable(workspaceRoot);
  const registry = readLanesRegistry(workspaceRoot);
  const collaboration = getCollaborationPaths(readWorkspaceState(workspaceRoot));
  if (registry.lanes.some((lane) => lane.lane === laneId)) {
    throw new Error(`Lane 已存在：${laneId}`);
  }
  const lane = {
    lane: laneId,
    purpose: normalizeMarkdownCell(options.purpose),
    current_session: "unbound",
    write_scope: normalizeMarkdownCell(options.write),
    worklog: defaultLaneWorklogPath(laneId),
    workspace: defaultLaneWorkspacePath(laneId)
  };
  const plan = buildLanesRegistryPlan(workspaceRoot, [...registry.lanes, lane], [
    fileAction(workspaceRoot, path.join(collaboration.root, lane.worklog), renderLaneWorklog(laneId)),
    fileAction(workspaceRoot, path.join(collaboration.root, lane.workspace, "README.md"), renderLaneWorkspaceReadme(laneId, collaboration))
  ]);
  printGenericPlan(options.dryRun ? "新增 Lane 预览（dry run）：" : "新增 Lane 计划：", plan.actions);
  if (options.dryRun) return;
  await confirmOrThrow(options, `是否新增 Lane ${laneId}？`);
  applyPlan(plan);
  console.log("");
  console.log(`Lane ${laneId} 已新增。`);
}

async function lanesBind(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printLanesBindHelp();
    return;
  }
  const laneId = normalizeLaneId(options._?.[0], "lane");
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
  assertAgentDocsReadyForMultiagent(workspaceRoot);
  assertMultiagentWritable(workspaceRoot);
  const registry = readLanesRegistry(workspaceRoot);
  const lane = findLaneOrThrow(registry.lanes, laneId);
  const session = resolveLaneSession(options);
  const parsedSession = parseAdapterSession(session, options.agent);
  if (lane.current_session && lane.current_session !== "unbound" && lane.current_session !== session && !options.yes) {
    throw new Error(`Lane ${laneId} 已绑定 ${lane.current_session}。如需覆盖，请传入 --yes。`);
  }
  const nextLanes = registry.lanes.map((item) => item.lane === laneId ? { ...item, current_session: session } : item);
  const lanesState = readAgentLanesState(workspaceRoot);
  const nextLanesState = updateAgentLaneHostState(lanesState, laneId, {
    host: parsedSession.host,
    current_session: session,
    thread_id: parsedSession.host === "codex" ? parsedSession.id : null,
    session_id: parsedSession.id,
    session_name: normalizeMarkdownCell(options.sessionName || ""),
    pinned: false,
    created_by: "starwork multiagent bind",
    created_at: new Date().toISOString()
  });
  const plan = buildLanesRegistryPlan(workspaceRoot, nextLanes, [stateFileAction(workspaceRoot, nextLanesState)]);
  const sessionName = normalizeMarkdownCell(options.sessionName || "");
  const dryRunSessionNameSync = createSessionNameSyncResult({
    requested: Boolean(sessionName),
    supported: null,
    status: sessionName ? "dry_run" : "not_requested",
    name: sessionName,
    warning: sessionName ? "Dry run only; host session was not renamed." : null
  });
  const dryRunPinSync = createHostPinResult({
    requested: Boolean(options.pin),
    supported: null,
    status: options.pin ? "dry_run" : "not_requested",
    warning: options.pin ? "Dry run only; host thread was not pinned." : null
  });
  if (options.json && options.dryRun) {
    console.log(JSON.stringify(renderLanesBindResult({
      workspaceRoot,
      laneId,
      session,
      dryRun: true,
      sessionNameSync: dryRunSessionNameSync,
      pinSync: dryRunPinSync
    }), null, 2));
    return;
  }
  if (!options.json) {
    printGenericPlan(options.dryRun ? "绑定 Lane 预览（dry run）：" : "绑定 Lane 计划：", plan.actions);
    if (sessionName) {
      console.log(`宿主会话名需由 starworkMultiagent 在 Codex App 中调用 set_thread_title 后，再由本命令记录：${sessionName}`);
      console.log("");
    }
    if (options.pin) {
      console.log("宿主置顶需由 starworkMultiagent 在 Codex App 中调用 set_thread_pinned；本命令只记录 StarWork binding。");
      console.log("");
    }
  }
  if (options.dryRun) return;
  await confirmOrThrow(options, `是否将当前会话绑定到 Lane ${laneId}？`);
  applyPlan(plan);
  const sessionNameSync = createSessionNameRecordOnlyResult({ sessionName });
  const pinSync = createHostPinRecordOnlyResult({ requested: Boolean(options.pin) });
  if (options.json) {
    console.log(JSON.stringify(renderLanesBindResult({
      workspaceRoot,
      laneId,
      session,
      dryRun: false,
      sessionNameSync,
      pinSync
    }), null, 2));
    return;
  }
  console.log("");
  console.log(`Lane ${laneId} 已绑定到 ${session}。`);
  printSessionNameSyncResult(sessionNameSync);
  printHostPinResult(pinSync);
}

async function lanesRelease(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printLanesReleaseHelp();
    return;
  }
  const laneId = normalizeLaneId(options._?.[0], "lane");
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
  assertMultiagentWritable(workspaceRoot);
  const registry = readLanesRegistry(workspaceRoot);
  const lane = findLaneOrThrow(registry.lanes, laneId);
  const nextLanes = registry.lanes.map((item) => item.lane === laneId ? { ...item, current_session: "unbound" } : item);
  const plan = buildLanesRegistryPlan(workspaceRoot, nextLanes);
  printGenericPlan(options.dryRun ? "释放 Lane 预览（dry run）：" : "释放 Lane 计划：", plan.actions);
  if (options.dryRun) return;
  await confirmOrThrow(options, `是否释放 Lane ${laneId}？`);
  applyPlan(plan);
  console.log("");
  console.log(`Lane ${laneId} 已释放。`);
  console.log(`请在交棒前更新工作记录：${lane.worklog}`);
}

async function lanesStatus(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printLanesStatusHelp();
    return;
  }
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
  const compatibilityReport = inspectMultiagentCompatibility(workspaceRoot);
  const registry = { lanes: compatibilityReport.lanes };
  const shared = compatibilityReport.shared;
  if (options.host) {
    const report = await collectLanesHostStatus(workspaceRoot, registry, { load: Boolean(options.load), transcript: options.transcript });
    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }
    printLanesHostStatus(report);
    return;
  }
  if (options.json) {
    console.log(JSON.stringify({
      schema: "starwork.agent_lanes.status.v0.1",
      workspace_root: workspaceRoot,
      lanes: registry.lanes,
      shared_outputs: shared.outputs,
      cross_lane_requests: shared.requests,
      multiagent: {
        compatibility: compatibilityReport.compatibility
      }
    }, null, 2));
    return;
  }
  console.log("");
  console.log("StarWork 多 AI 协作状态");
  console.log("");
  const bound = registry.lanes.filter((lane) => lane.current_session && lane.current_session !== "unbound").length;
  const openRequests = shared.requests.filter((request) => request.status !== "done");
  console.log(`职责位：${registry.lanes.length} 个；已绑定会话：${bound} 个；共享输出：${shared.outputs.length} 项；待处理请求：${openRequests.length} 项`);
  console.log("");
  if (!registry.lanes.length) {
    console.log("还没有登记任何职责位。可以先运行 starwork multiagent init，或让 starworkMultiagent 帮你设计。");
  } else {
    for (const lane of registry.lanes) {
      console.log(`- ${lane.lane}: ${lane.purpose}`);
      console.log(`  当前会话：${lane.current_session || "unbound"}`);
      console.log(`  可写范围：${lane.write_scope}`);
      console.log(`  工作记录：${lane.worklog}`);
      console.log(`  临时工作区：${lane.workspace}`);
    }
  }
  if (openRequests.length) {
    console.log("");
    console.log("待处理协作请求：");
    openRequests.forEach((request) => console.log(`- ${request.from} -> ${request.to}: ${request.request} (${request.status})`));
  }
  printMultiagentCompatibilitySummary(compatibilityReport);
}

async function lanesUpgrade(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printLanesUpgradeHelp();
    return;
  }
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
  const plan = buildMultiagentMigrationPlan(workspaceRoot);
  if (options.json) {
    console.log(JSON.stringify(renderMultiagentMigrationPlanJson(plan), null, 2));
  } else {
    printMultiagentMigrationPlan(plan, options.dryRun || !options.yes);
  }
  if (options.dryRun || (!options.yes && !options.dryRun)) {
    return;
  }
  if (!plan.safeToApply) {
    throw new Error("检测到冲突或无法安全迁移的旧结构，不能执行 --yes。请先人工处理冲突。");
  }
  await confirmOrThrow(options, "是否执行 MultiAgent 结构迁移？");
  applyMultiagentMigrationPlan(plan);
  if (!options.json) {
    console.log("");
    console.log("MultiAgent 结构迁移已完成。");
    console.log(`迁移报告：${plan.reportPath}`);
  }
}

async function lanesWorkflowStart(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printLanesWorkflowStartHelp();
    return;
  }
  if (!options.definition) throw new Error("multiagent workflow start 需要 --definition <path>。");
  if (!options.entryNode) throw new Error("multiagent workflow start 需要 --entry-node <node>。");
  if (!options.actorLane) throw new Error("multiagent workflow start 需要 --actor-lane <lane>。");
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
  assertMultiagentWritable(workspaceRoot);
  const registry = readLanesRegistry(workspaceRoot);
  const actorLane = normalizeLaneId(options.actorLane, "actor lane");
  findLaneOrThrow(registry.lanes, actorLane);
  const definition = loadWorkflowDefinition(options.definition, workspaceRoot);
  const entryNode = normalizeWorkflowNodeId(options.entryNode, "entry node");
  const node = getWorkflowNodeOrThrow(definition, entryNode);
  const runId = options.run ? requireWorkflowRunId(options.run) : (options.id ? normalizeWorkflowRunId(options.id) : buildWorkflowRunId(definition.workflow_id));
  const now = new Date().toISOString();
  const route = computeWorkflowRoute({
    workspaceRoot,
    registry,
    definition,
    run: {
      run_id: runId,
      current_node: entryNode,
      current_actor_lane: actorLane
    },
    eventKey: null,
    currentSession: null,
    writeEvent: false
  });
  const run = {
    schema_version: 1,
    schema: WORKFLOW_RUN_SCHEMA,
    run_id: runId,
    workflow_id: definition.workflow_id,
    workflow_version: definition.version,
    workflow_definition_path: definition.relative_path,
    status: route.route_status,
    current_node: entryNode,
    current_step: entryNode,
    current_actor_lane: actorLane,
    next_target_node: route.target_node || null,
    next_target_lane: route.to_lane || null,
    last_event_id: null,
    blocked_reason: route.blocked_reason || null,
    created_at: now,
    updated_at: now,
    route_source: "definition + run_state",
    events: []
  };
  appendWorkflowEvent(run, {
    type: "run_started",
    actor_lane: actorLane,
    node: entryNode,
    status: run.status,
    route_event: route.route_event || null,
    blocked_reason: run.blocked_reason
  });
  await confirmOrThrow(options, `是否创建 workflow run ${runId}？`);
  writeWorkflowRun(workspaceRoot, run);
  const result = {
    schema: "starwork.multiagent.workflow_start.v0.1",
    run,
    route
  };
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log("");
  console.log(`Workflow run 已创建：${runId}`);
  console.log(`current step: ${entryNode}`);
  console.log(`next target lane: ${run.next_target_lane || "(none)"}`);
  console.log(`status: ${run.status}`);
}

async function lanesWorkflowStatus(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printLanesWorkflowStatusHelp();
    return;
  }
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
  const run = readWorkflowRun(workspaceRoot, requireWorkflowRunId(options.run));
  const result = {
    schema: "starwork.multiagent.workflow_status.v0.1",
    run
  };
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log("");
  console.log(`Workflow run: ${run.run_id}`);
  console.log(`workflow: ${run.workflow_id}@${run.workflow_version}`);
  console.log(`status: ${run.status}`);
  console.log(`current step: ${run.current_step || run.current_node}`);
  console.log(`from lane: ${run.current_actor_lane}`);
  console.log(`target lane: ${run.next_target_lane || "(none)"}`);
  console.log(`blocked reason: ${run.blocked_reason || "(none)"}`);
}

async function lanesWorkflowRoute(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printLanesWorkflowRouteHelp();
    return;
  }
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
  assertMultiagentWritable(workspaceRoot);
  const registry = readLanesRegistry(workspaceRoot);
  const run = readWorkflowRun(workspaceRoot, requireWorkflowRunId(options.run));
  const definition = loadWorkflowDefinition(path.resolve(workspaceRoot, run.workflow_definition_path), workspaceRoot);
  const route = computeWorkflowRoute({
    workspaceRoot,
    registry,
    definition,
    run,
    eventKey: parseWorkflowRouteEvent(options.event),
    currentSession: resolveCurrentWorkflowSession(options),
    writeEvent: true
  });
  applyWorkflowRouteToRun(run, route);
  writeWorkflowRun(workspaceRoot, run);
  if (options.json) {
    console.log(JSON.stringify(route, null, 2));
    return;
  }
  printWorkflowRoute(route);
}

async function lanesWorkflowEventRecord(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printLanesWorkflowEventRecordHelp();
    return;
  }
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
  assertMultiagentWritable(workspaceRoot);
  const run = readWorkflowRun(workspaceRoot, requireWorkflowRunId(options.run));
  if (!options.type) throw new Error("multiagent workflow event record 需要 --type <type>。");
  if (!options.status) throw new Error("multiagent workflow event record 需要 --status <status>。");
  const nextStatus = normalizeWorkflowStatus(options.status);
  validateWorkflowStatusTransition(run.status, nextStatus);
  if (nextStatus === "delivered" && (!run.next_target_node || !run.next_target_lane)) {
    throw new Error("workflow delivered 需要先有 route 计算出的 next_target_node / next_target_lane。");
  }
  await confirmOrThrow(options, `是否记录 workflow event ${options.type} -> ${nextStatus}？`);
  run.status = nextStatus;
  run.blocked_reason = isWorkflowBlockedStatus(nextStatus) ? (options.message || run.blocked_reason || nextStatus) : null;
  run.updated_at = new Date().toISOString();
  appendWorkflowEvent(run, {
    type: normalizeMarkdownCell(options.type),
    status: nextStatus,
    actor_lane: run.current_actor_lane,
    node: run.current_node,
    blocked_reason: run.blocked_reason,
    message: options.message || ""
  });
  if (nextStatus === "delivered") {
    advanceWorkflowRunAfterDelivered(run);
  }
  writeWorkflowRun(workspaceRoot, run);
  const result = {
    schema: "starwork.multiagent.workflow_event_record.v0.1",
    run_id: run.run_id,
    status: run.status,
    event: run.events[run.events.length - 1],
    run
  };
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log("");
  console.log(`Workflow event 已记录：${result.event.event_id}`);
  console.log(`status: ${run.status}`);
}

async function collectLanesHostStatus(workspaceRoot, registry, options = {}) {
  const lanesState = readAgentLanesState(workspaceRoot);
  const lanes = await Promise.all(registry.lanes.map(async (lane) => {
    const hostState = lanesState.lanes?.[lane.lane] || {};
    const host = await observeHostSession(hostState.current_session || lane.current_session, {
      workspaceRoot,
      command: "status",
      includeTurns: false,
      load: Boolean(options.load),
      transcriptPath: options.transcript
    });
    return {
      lane: lane.lane,
      starwork: {
        bound: Boolean(lane.current_session && lane.current_session !== "unbound"),
        session: lane.current_session || "unbound",
        worklog: lane.worklog,
        write_scope: lane.write_scope,
        warning: hostState.current_session && hostState.current_session !== lane.current_session
          ? `state.json session ${hostState.current_session} differs from agent-lanes.md ${lane.current_session || "unbound"}`
          : null
      },
      host
    };
  }));
  return {
    schema: "starwork.agent_lanes.host_status.v0.2",
    workspace_root: workspaceRoot,
    lanes
  };
}

function printLanesHostStatus(report) {
  console.log("");
  console.log("StarWork 多 AI 协作状态（含宿主观察）");
  console.log("");
  for (const item of report.lanes) {
    console.log(`- ${item.lane}`);
    console.log(`  StarWork state: ${item.starwork.bound ? item.starwork.session : "unbound"}；worklog=${item.starwork.worklog}；write_scope=${item.starwork.write_scope}`);
    if (item.starwork.warning) console.log(`  Warning: ${item.starwork.warning}`);
    console.log(`  ${item.host.adapter || "host"} observation: ${item.host.status}${item.host.name ? `；name=${item.host.name}` : ""}${item.host.cwd ? `；cwd=${item.host.cwd}` : ""}${Number.isInteger(item.host.turn_count) ? `；turns=${item.host.turn_count}` : ""}`);
    if (item.host.continue_command) console.log(`  Continue: ${item.host.continue_command}`);
    if (item.host.status === "notLoaded") {
      console.log("  说明：notLoaded 表示 thread 可能存在于历史中，但当前宿主观察接口尚未加载；可显式使用 --load。");
    }
    if (item.host.warning) console.log(`  Warning: ${item.host.warning}`);
  }
  console.log("");
  console.log("提示：宿主观察只做辅助判断；正式交接仍以 lane worklog 和 shared outputs 为准。");
}

async function lanesRead(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printLanesReadHelp();
    return;
  }
  const laneId = normalizeLaneId(options._?.[0], "lane");
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
  const registry = readLanesRegistry(workspaceRoot);
  const lane = findLaneOrThrow(registry.lanes, laneId);
  const lanesState = readAgentLanesState(workspaceRoot);
  const session = lanesState.lanes?.[laneId]?.current_session || lane.current_session;
  const parsedSession = parseAdapterSession(session);
  const turnLimit = options.turns ? Number.parseInt(options.turns, 10) : 0;
  if (options.turns && (!Number.isInteger(turnLimit) || turnLimit < 1)) {
    throw new Error("--turns 必须是正整数。");
  }
  const observation = await observeHostSession(session, {
    workspaceRoot,
    command: "read",
    includeTurns: Boolean(options.includeTurns || turnLimit),
    load: false,
    turnLimit,
    transcriptPath: options.transcript
  });
  const report = {
    schema: "starwork.agent_lanes.read.v0.2",
    lane: laneId,
    starwork: {
      session: lane.current_session,
      worklog: lane.worklog,
      write_scope: lane.write_scope
    },
    host: observation
  };
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log("");
  console.log(`Lane ${laneId} 的 ${parsedSession.host} host observation`);
  console.log("");
  console.log(`状态：${observation.status}`);
  if (observation.name) console.log(`标题：${observation.name}`);
  if (observation.cwd) console.log(`cwd：${observation.cwd}`);
  if (Number.isInteger(observation.turn_count)) console.log(`turn 数：${observation.turn_count}`);
  if (observation.turns?.length) {
    console.log("");
    console.log(`最近 ${observation.turns.length} 条摘要：`);
    for (const turn of observation.turns) {
      console.log(`- ${turn.id || "(unknown)"} ${turn.role || turn.status || ""}${turn.summary ? `：${turn.summary}` : ""}`.trim());
    }
  }
  if (observation.warning) console.log(`Warning: ${observation.warning}`);
  console.log("");
  console.log("这是宿主观察。正式交接仍以 lane worklog 和 shared outputs 为准。");
}

async function lanesInstruct(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printLanesInstructHelp();
    return;
  }
  const toLane = normalizeLaneId(options._?.[0], "to-lane");
  const fromLane = normalizeLaneId(options.from || "user", "from lane");
  if (!options.message) throw new Error("multiagent instruct 需要 --message <text>。");
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
  assertMultiagentWritable(workspaceRoot);
  const state = readWorkspaceState(workspaceRoot);
  const collaboration = getCollaborationPaths(state);
  const registry = readLanesRegistry(workspaceRoot);
  const targetLane = findLaneOrThrow(registry.lanes, toLane);
  if (fromLane !== "user") findLaneOrThrow(registry.lanes, fromLane);
  const lanesState = readAgentLanesState(workspaceRoot);
  const requestId = buildLaneRequestId(toLane);
  const message = renderMultiagentInstructionMessage({
    requestId,
    fromLane,
    toLane,
    message: options.message,
    collaboration,
    targetLane,
    workspaceRoot
  });
  const targetSession = lanesState.lanes?.[toLane]?.current_session || targetLane.current_session;
  const parsedSession = parseAdapterSession(targetSession);
  const route = resolveHostRuntimeCapability({ workspaceRoot, parsedSession, command: "instruct" });
  const canAutoSend = !options.manualHandoff && route.action === "auto_send";
  const dryRunRequest = buildSharedRequestRow({
    id: requestId,
    from: fromLane,
    to: toLane,
    request: options.message,
    status: canAutoSend ? "recorded" : MANUAL_HANDOFF_STATUS,
    hostDelivery: canAutoSend ? "pending" : MANUAL_HANDOFF_STATUS,
    link: collaboration.shared
  });
  const shared = readSharedContext(workspaceRoot);
  const dryPlan = buildSharedContextPlan(workspaceRoot, {
    outputs: shared.outputs,
    requests: [...shared.requests, dryRunRequest],
    agreements: shared.agreements
  });
  if (options.json && options.dryRun) {
    console.log(JSON.stringify({ schema: "starwork.agent_lanes.instruct.v0.4", dry_run: true, request: dryRunRequest, host: renderHostRoute(route), formatted_message: message }, null, 2));
    return;
  }
  if (!options.json) {
    printGenericPlan(options.dryRun ? "跨会话指令预览（dry run）：" : "跨会话指令计划：", dryPlan.actions);
    if (canAutoSend) console.log(`将通过宿主标准能力发送到 ${parsedSession.host}:${parsedSession.id}`);
    else console.log(`目标 lane 路由结果：${route.status}；将按 CLI 返回状态记录。`);
    console.log("");
  }
  if (options.dryRun) return;
  await confirmOrThrow(options, `是否向 Lane ${toLane} 发送指令？`);
  let delivery;
  if (options.manualHandoff) {
    delivery = createManualHandoffDelivery({
      parsedSession,
      message,
      reason: "Manual handoff requested"
    });
  } else if (canAutoSend) {
    delivery = await sendCodexInstruction({
        threadId: parsedSession.id,
        message,
        timeout: parsePositiveInt(options.timeout, 300000),
        waitCompletion: Boolean(options.waitCompletion)
      });
    delivery.mode = "host_standard_api";
  } else {
    delivery = createDeliveryFromRoute({ route, parsedSession, message, workspaceRoot });
  }
  const finalRequest = buildSharedRequestRow({
    id: requestId,
    from: fromLane,
    to: toLane,
    request: options.message,
    status: delivery.status,
    hostDelivery: delivery.status,
    link: collaboration.shared
  });
  const nextState = {
    ...lanesState,
    requests: [...(lanesState.requests || []), {
      id: requestId,
      from: fromLane,
      to: toLane,
      message_type: "instruction",
      recorded_in: collaboration.shared,
      host_delivery: delivery
    }]
  };
  applyPlan({
    targetDir: workspaceRoot,
    actions: [
      ...buildSharedContextPlan(workspaceRoot, {
        outputs: shared.outputs,
        requests: [...shared.requests, finalRequest],
        agreements: shared.agreements
      }).actions,
      stateFileAction(workspaceRoot, nextState)
    ]
  });
  if (options.json) {
    console.log(JSON.stringify({ schema: "starwork.agent_lanes.instruct.v0.4", request: finalRequest, host: renderHostRoute(route), host_delivery: delivery }, null, 2));
    return;
  }
  console.log("");
  console.log(delivery.status === MANUAL_HANDOFF_STATUS
    ? `已记录跨 lane 指令（尚未自动送达）：${requestId}`
    : `已记录跨 lane 指令：${requestId}`);
  console.log(`Host delivery：${delivery.status}${delivery.warning ? ` (${delivery.warning})` : ""}`);
  if (delivery.status === MANUAL_HANDOFF_STATUS && delivery.formatted_message) {
    console.log("");
    console.log("需要手动转交以下消息：");
    console.log("");
    console.log(delivery.formatted_message.trimEnd());
  }
}

async function lanesHandoff(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printLanesHandoffHelp();
    return;
  }
  await lanesInstruct([...argv, "--manual-handoff"]);
}

async function lanesContinue(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printLanesContinueHelp();
    return;
  }
  const laneId = normalizeLaneId(options._?.[0], "lane");
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
  const registry = readLanesRegistry(workspaceRoot);
  const lane = findLaneOrThrow(registry.lanes, laneId);
  const lanesState = readAgentLanesState(workspaceRoot);
  const session = lanesState.lanes?.[laneId]?.current_session || lane.current_session;
  const parsedSession = parseAdapterSession(session);
  const result = buildHostContinueResult(parsedSession);
  if (options.json) {
    console.log(JSON.stringify({
      schema: "starwork.agent_lanes.continue.v0.1",
      lane: laneId,
      session,
      ...result
    }, null, 2));
    return;
  }
  console.log("");
  console.log(`Lane ${laneId} 继续会话`);
  console.log("");
  console.log(`宿主：${parsedSession.host}`);
  console.log(`状态：${result.status}`);
  if (result.command) console.log(`命令：${result.command}`);
  if (result.instructions) console.log(`说明：${result.instructions}`);
}

async function lanesLaunch(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printLanesLaunchHelp();
    return;
  }
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
  assertAgentDocsReadyForMultiagent(workspaceRoot);
  const state = readWorkspaceState(workspaceRoot);
  const collaboration = getCollaborationPaths(state);
  const registry = readLanesRegistry(workspaceRoot);
  const laneIds = options.lanes ? parseLaneList(options.lanes) : [normalizeLaneId(options._?.[0], "lane")];
  const lanes = laneIds.map((laneId) => findLaneOrThrow(registry.lanes, laneId));
  const actions = [];
  const launchResults = [];
  const launchHost = resolveLaneLaunchHost({ options, lanes, workspaceRoot });
  if (launchHost && launchHost !== "codex") {
    for (const lane of lanes) {
      launchResults.push(buildManualHostLaunchResult({
        lane,
        host: launchHost,
        sessionName: buildLaneLaunchSessionName({ lane, workspaceRoot, explicitName: options.sessionName }),
        dryRun: Boolean(options.dryRun),
        message: renderMultiagentLaunchMessage({ lane, fromLane: options.from || "user", workspaceRoot, collaboration })
      }));
    }
    if (options.json) {
      console.log(JSON.stringify({ schema: "starwork.agent_lanes.launch.v0.3", dry_run: Boolean(options.dryRun), launches: launchResults }, null, 2));
      return;
    }
    console.log("");
    console.log(`${launchHost} lane launch 需要人工启动：`);
    launchResults.forEach((result) => console.log(`- ${result.lane}: ${result.launch_status}${result.instructions ? `；${result.instructions}` : ""}`));
    return;
  }
  if (options.dryRun) {
    for (const lane of lanes) {
      const sessionName = buildLaneLaunchSessionName({ lane, workspaceRoot, explicitName: options.sessionName });
      launchResults.push({
        lane: lane.lane,
        dry_run: true,
        session_name: sessionName,
        launch_status: "dry_run",
        rename_status: sessionName ? "dry_run" : "not_requested",
        binding_status: "dry_run",
        message: renderMultiagentLaunchMessage({ lane, fromLane: options.from || "user", workspaceRoot, collaboration })
      });
    }
    if (options.json) {
      console.log(JSON.stringify({ schema: "starwork.agent_lanes.launch.v0.3", dry_run: true, launches: launchResults }, null, 2));
      return;
    }
    console.log("");
    console.log("Codex lane launch 预览（dry run）：");
    launchResults.forEach((result) => console.log(`- ${result.lane}${result.session_name ? ` -> ${result.session_name}` : ""}`));
    return;
  }
  await confirmOrThrow(options, `是否生成 ${lanes.length} 个 Codex lane launch message？`);
  for (const lane of lanes) {
    const sessionName = buildLaneLaunchSessionName({ lane, workspaceRoot, explicitName: options.sessionName });
    const launchMessage = renderMultiagentLaunchMessage({ lane, fromLane: options.from || "user", workspaceRoot, collaboration });
    launchResults.push({
      lane: lane.lane,
      adapter: "codex",
      status: MANUAL_HANDOFF_STATUS,
      session_name: sessionName,
      launch_status: MANUAL_HANDOFF_STATUS,
      rename_status: sessionName ? "requires_starworkMultiagent_tool" : "not_requested",
      binding_status: "unbound",
      message: launchMessage,
      instructions: "Codex App 标准路径必须由 starworkMultiagent 直接调用 create_thread；CLI 只生成 Launch Message，不创建或绑定 Codex thread。",
      warning: "CLI no longer launches Codex threads directly."
    });
  }
  if (options.json) {
    console.log(JSON.stringify({ schema: "starwork.agent_lanes.launch.v0.3", launches: launchResults }, null, 2));
    return;
  }
  console.log("");
  launchResults.forEach((result) => {
    console.log(`Lane ${result.lane}: ${result.status}${result.session_name ? ` -> ${result.session_name}` : ""}${result.warning ? ` - ${result.warning}` : ""}`);
    console.log("  需要在 starworkMultiagent Skill 中调用 create_thread，成功返回 threadId 后再运行 multiagent bind 记录绑定。");
    console.log("");
    console.log(result.message.trimEnd());
  });
}

async function lanesMessage(argv) {
  const subcommand = argv[0];
  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    printLanesMessageHelp();
    return;
  }
  if (subcommand === "launch") {
    await lanesMessageLaunch(argv.slice(1));
    return;
  }
  if (subcommand === "instruct") {
    await lanesMessageInstruct(argv.slice(1));
    return;
  }
  throw new Error(`未知 multiagent message 子命令：${subcommand}`);
}

async function lanesMessageLaunch(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printLanesMessageLaunchHelp();
    return;
  }
  const laneId = normalizeLaneId(options._?.[0], "lane");
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
  const state = readWorkspaceState(workspaceRoot);
  const collaboration = getCollaborationPaths(state);
  const registry = readLanesRegistry(workspaceRoot);
  const lane = findLaneOrThrow(registry.lanes, laneId);
  const sessionName = buildLaneLaunchSessionName({ lane, workspaceRoot, explicitName: options.sessionName });
  const message = renderMultiagentLaunchMessage({ lane, fromLane: options.from || "user", workspaceRoot, collaboration });
  const payload = {
    schema: "starwork.agent_lanes.message.v0.1",
    type: "launch",
    lane: laneId,
    session_name: sessionName,
    message
  };
  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  console.log(message.trimEnd());
}

async function lanesMessageInstruct(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printLanesMessageInstructHelp();
    return;
  }
  const toLane = normalizeLaneId(options._?.[0], "to-lane");
  const fromLane = normalizeLaneId(options.from || "user", "from lane");
  if (!options.message) throw new Error("multiagent message instruct 需要 --message <text>。");
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
  const { requestId, message } = buildMultiagentInstructionPayload({
    workspaceRoot,
    toLane,
    fromLane,
    text: options.message,
    requestId: options.id
  });
  const payload = {
    schema: "starwork.agent_lanes.message.v0.1",
    type: "instruction",
    request_id: requestId,
    from_lane: fromLane,
    to_lane: toLane,
    message
  };
  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  console.log(message.trimEnd());
}

async function lanesRequest(argv) {
  const subcommand = argv[0];
  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    printLanesRequestHelp();
    return;
  }
  if (subcommand === "record") {
    await lanesRequestRecord(argv.slice(1));
    return;
  }
  throw new Error(`未知 multiagent request 子命令：${subcommand}`);
}

async function lanesRequestRecord(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printLanesRequestRecordHelp();
    return;
  }
  const fromLane = normalizeLaneId(options.from || "user", "from lane");
  const toLane = normalizeLaneId(options.to || options._?.[0], "to-lane");
  if (!options.message) throw new Error("multiagent request record 需要 --message <text>。");
  const hostDelivery = normalizeHostDeliveryStatus(options.hostDelivery || options.status || "");
  const deliveryTool = normalizeMarkdownCell(options.deliveryTool || "manual");
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
  assertMultiagentWritable(workspaceRoot);
  const state = readWorkspaceState(workspaceRoot);
  const collaboration = getCollaborationPaths(state);
  const registry = readLanesRegistry(workspaceRoot);
  if (fromLane !== "user") findLaneOrThrow(registry.lanes, fromLane);
  findLaneOrThrow(registry.lanes, toLane);
  const requestId = options.id ? normalizeMarkdownCell(options.id) : buildLaneRequestId(toLane);
  const shared = readSharedContext(workspaceRoot);
  const requestRow = buildSharedRequestRow({
    id: requestId,
    from: fromLane,
    to: toLane,
    request: options.message,
    status: hostDelivery,
    hostDelivery,
    link: collaboration.shared
  });
  const lanesState = readAgentLanesState(workspaceRoot);
  const nextState = {
    ...lanesState,
    requests: [...(lanesState.requests || []), {
      id: requestId,
      from: fromLane,
      to: toLane,
      message_type: "instruction",
      recorded_in: collaboration.shared,
      host_delivery: {
        status: hostDelivery,
        delivery_tool: deliveryTool,
        mode: "record_only"
      }
    }]
  };
  const actions = [
    ...buildSharedContextPlan(workspaceRoot, {
      outputs: shared.outputs,
      requests: [...shared.requests, requestRow],
      agreements: shared.agreements
    }).actions,
    stateFileAction(workspaceRoot, nextState)
  ];
  if (!options.json) printGenericPlan(options.dryRun ? "记录跨 lane 请求预览（dry run）：" : "记录跨 lane 请求计划：", actions);
  if (options.dryRun) {
    if (options.json) console.log(JSON.stringify({ schema: "starwork.agent_lanes.request_record.v0.1", dry_run: true, request: requestRow }, null, 2));
    return;
  }
  await confirmOrThrow(options, `是否记录 ${fromLane} -> ${toLane} 的跨 lane 请求？`);
  applyPlan({ targetDir: workspaceRoot, actions });
  const result = {
    schema: "starwork.agent_lanes.request_record.v0.1",
    request: requestRow,
    host_delivery: {
      status: hostDelivery,
      delivery_tool: deliveryTool,
      mode: "record_only"
    }
  };
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log("");
  console.log(`已记录跨 lane 请求：${requestId}`);
}

async function lanesShare(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printLanesShareHelp();
    return;
  }
  const from = normalizeLaneId(options._?.[0], "lane");
  if (!options.title) {
    throw new Error("multiagent share 需要 --title <text>。");
  }
  if (!options.path) {
    throw new Error("multiagent share 需要 --path <relative-path>。");
  }
  if (!options.audience) {
    throw new Error("multiagent share 需要 --audience <lane-list>。");
  }
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
  assertMultiagentWritable(workspaceRoot);
  const state = readWorkspaceState(workspaceRoot);
  const collaboration = getCollaborationPaths(state);
  const registry = readLanesRegistry(workspaceRoot);
  findLaneOrThrow(registry.lanes, from);
  const outputPath = normalizeSafeRelativePath(options.path, "multiagent share --path");
  const shared = readSharedContext(workspaceRoot);
  const row = {
    from,
    title: normalizeMarkdownCell(options.title),
    path: outputPath,
    audience: normalizeMarkdownCell(options.audience),
    status: normalizeMarkdownCell(options.status || "draft"),
    updated: todayIsoDate()
  };
  const plan = buildSharedContextPlan(workspaceRoot, {
    outputs: [...shared.outputs, row],
    requests: shared.requests,
    agreements: shared.agreements
  });
  printGenericPlan(options.dryRun ? "共享输出登记预览（dry run）：" : "共享输出登记计划：", plan.actions);
  if (options.dryRun) return;
  await confirmOrThrow(options, "是否登记共享输出？");
  applyPlan(plan);
  console.log("");
  console.log(`已登记共享输出：${row.title}`);
  console.log(`其他职责位可以查看：${collaboration.shared}，并按受众范围读取 ${row.path}`);
}

async function packInstall(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printPackInstallHelp();
    return;
  }

  const packId = options.pack || options._?.[0];
  if (!packId) {
    throw new Error("pack install 需要指定 Pack ID。");
  }

  const targetDir = path.resolve(options.target || process.cwd());
  const workspaceRoot = requireWorkspaceRoot(targetDir);
  const state = readWorkspaceState(workspaceRoot);

  if (state.packs?.some((pack) => pack.id === packId)) {
    console.log(`Pack ${packId} 已安装，无需重复安装。`);
    return;
  }

  const health = doctorCollect(workspaceRoot);
  if (health.summary.fail > 0) {
    throw new Error("当前工作台未通过 doctor 检查，请先修复阻塞问题。");
  }

  const pack = loadPack(packId, state.language || "zh");
  validatePack(pack, state.workspace_type);
  const plan = buildPackInstallPlan({ workspaceRoot, state, pack });

  printGenericPlan(options.dryRun ? "Pack 安装预览（dry run）：" : "Pack 安装计划：", plan.actions);
  if (options.dryRun) return;

  await confirmOrThrow(options, `是否安装 Pack ${pack.id}？`);
  applyPlan(plan);
  console.log("");
  console.log(`Pack ${pack.name || pack.id} 已安装。`);
  console.log("下一步建议：运行 starwork doctor 检查 Pack 落地结果。");
}

async function upgradeWorkspace(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printUpgradeHelp();
    return;
  }

  if (!options.blueprint) {
    throw new Error("upgrade v0.1 必须传入 --blueprint <upgrade-blueprint.json>。请先用 starworkDoctor skill 诊断并生成升级蓝图。");
  }

  const targetDir = path.resolve(options.target || process.cwd());
  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    throw new Error(`upgrade 目标目录不存在或不是目录：${targetDir}`);
  }
  if (findWorkspaceRoot(targetDir)) {
    throw new Error("当前目录已经是 StarWork 工作台，不应使用 upgrade。后续请使用 update 或 repair。");
  }

  const blueprint = loadUpgradeBlueprint(options.blueprint);
  const plan = buildUpgradePlan({ targetDir, blueprint });

  if (options.json && options.dryRun) {
    console.log(JSON.stringify(renderUpgradePlanJson(plan, true), null, 2));
    return;
  }

  if (!options.json) {
    printUpgradePlan(plan, options.dryRun);
  }
  if (options.dryRun) return;

  await confirmOrThrow(options, "是否按 upgrade blueprint 执行升级？");
  applyPlan(plan);

  if (options.json) {
    console.log(JSON.stringify(renderUpgradeExecutionJson(plan), null, 2));
    return;
  }

  console.log("");
  console.log("StarWork 工作台升级已完成。");
  console.log("");
  console.log(`下一步建议：运行 starwork doctor --target ${plan.targetDir}`);
}

function doctor(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printDoctorHelp();
    return { exitCode: 0 };
  }

  const targetDir = path.resolve(options.target || process.cwd());
  const result = collectDoctorResult(targetDir, options);
  return finishDoctor(result, options);
}

function collectDoctorResult(targetDir, options = {}) {
  const result = createDoctorResult(targetDir);

  if (!fs.existsSync(targetDir)) {
    addCheck(result, "workspace.target.exists", "fail", `目标目录不存在：${targetDir}`);
    return result;
  }

  result.inventory = collectInventory(targetDir, options);
  result.signals = detectWorkspaceSignals(result.inventory);

  const workspaceRoot = findWorkspaceRoot(targetDir);
  if (!workspaceRoot) {
    const legacy = detectLegacyWorkspace(targetDir, result.signals);
    if (legacy.candidate) {
      result.upgrade = buildLegacySignals(legacy);
      addCheck(result, "workspace.state.exists", "fail", "这是一个可升级的历史模板工作区，但缺少 .starwork/workspace.json。", legacy.primaryTrace);
      addLegacyChecks(result, legacy);
    } else {
      const trace = findStarWorkTrace(targetDir);
      if (trace) {
        addCheck(result, "workspace.state.exists", "fail", "疑似 StarWork 工作台，但缺少 .starwork/workspace.json。", trace);
      } else {
        addCheck(result, "workspace.state.exists", "fail", "当前目录不是 StarWork 工作台。请让 Agent 使用 starworkInit Skill 完成接入；CLI 只作为确认方案后的执行工具。");
      }
    }
    return result;
  }

  result.workspace_root = workspaceRoot;
  const statePath = path.join(workspaceRoot, ".starwork", "workspace.json");
  addCheck(result, "workspace.state.exists", "pass", ".starwork/workspace.json exists", ".starwork/workspace.json");

  let state;
  try {
    state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  } catch (error) {
    addCheck(result, "workspace.state.parse", "fail", `无法解析 workspace state：${error.message}`, ".starwork/workspace.json");
    return result;
  }
  result.workspace = {
    core: state.core || null,
    workspace_type: state.workspace_type || null,
    kit: state.kit || null,
    language: state.language || null,
    packs: Array.isArray(state.packs) ? state.packs.map((pack) => pack.id).filter(Boolean) : []
  };
  checkWorkspaceState(result, state);
  checkKit(result, workspaceRoot, state);
  checkCoreRoles(result, workspaceRoot, state);
  checkKnowledgeCapability(result, workspaceRoot, state);
  checkPackInstallations(result, workspaceRoot, state);
  checkBlueprintCustomization(result, workspaceRoot, state);
  checkUpgradeRoleMappings(result, workspaceRoot, state);
  checkSkillInstallations(result, workspaceRoot, state);
  checkAgentRuleReferences(result, workspaceRoot);
  checkAgentDocsDraftState(result, workspaceRoot);
  checkHostAdapters(result, workspaceRoot, state, options);
  checkMultiagentCompatibility(result, workspaceRoot);
  result.ok = result.summary.fail === 0;
  result.strict_ok = result.ok;
  result.exitCode = result.ok ? 0 : 1;
  return result;
}

function doctorCollect(targetDir) {
  return collectDoctorResult(targetDir);
}

function createDoctorResult(targetDir) {
  return {
    schema: "starwork.doctor.result.v0.1",
    ok: false,
    strict_ok: false,
    workspace_root: null,
    target: targetDir,
    workspace: null,
    skills: null,
    upgrade: null,
    multiagent: null,
    knowledge: null,
    inventory: null,
    signals: null,
    summary: {
      pass: 0,
      info: 0,
      warn: 0,
      fail: 0
    },
    checks: [],
    exitCode: 1
  };
}

function requireWorkspaceRoot(targetDir) {
  if (!fs.existsSync(targetDir)) {
    throw new Error(`目标目录不存在：${targetDir}`);
  }
  const workspaceRoot = findWorkspaceRoot(targetDir);
  if (!workspaceRoot) {
    throw new Error("当前目录不是 StarWork 工作台。请让 Agent 使用 starworkInit Skill 完成接入；CLI 只作为确认方案后的执行工具。");
  }
  return workspaceRoot;
}

function readWorkspaceState(workspaceRoot) {
  const statePath = path.join(workspaceRoot, ".starwork", "workspace.json");
  try {
    return JSON.parse(fs.readFileSync(statePath, "utf8"));
  } catch (error) {
    throw new Error(`无法读取 workspace state：${error.message}`);
  }
}

async function confirmOrThrow(options, question) {
  if (options.dryRun) return;
  if (!options.yes && process.stdin.isTTY) {
    const ok = await confirm(question, true);
    if (!ok) {
      throw new Error("已取消，没有写入任何文件。");
    }
  } else if (!options.yes && !process.stdin.isTTY) {
    throw new Error("非交互环境需要传入 --yes 或 --dry-run。");
  }
}

async function knowledgeCommand(argv) {
  const subcommand = argv[0] && !argv[0].startsWith("-") ? argv[0] : "status";
  const options = parseArgs(argv.slice(subcommand === "status" && (!argv[0] || argv[0].startsWith("-")) ? 0 : 1));

  if (options.help) {
    printKnowledgeHelp();
    return;
  }

  if (subcommand === "init") {
    await knowledgeInit(options);
    return;
  }

  if (subcommand === "status") {
    knowledgeStatus(options);
    return;
  }

  if (subcommand === "check") {
    const result = knowledgeCheck(options);
    process.exitCode = result.ok ? 0 : 1;
    return;
  }

  if (subcommand === "apply") {
    await knowledgeApply(options);
    return;
  }

  throw new Error(`未知 knowledge 子命令：${subcommand}`);
}

async function knowledgeInit(options) {
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
  const state = readWorkspaceState(workspaceRoot);
  assertProjectKnowledgeWorkspace(state);
  const language = options.language || state.language || "zh";
  validateLanguage(language);
  const root = options.path || getKnowledgeDefaultRoot(language);
  const plan = buildKnowledgeInitPlan({ workspaceRoot, state, language, root });

  printGenericPlan(options.dryRun ? "项目知识库创建预览（dry run）：" : "项目知识库创建计划：", plan.actions);
  if (options.dryRun) return;
  await confirmOrThrow(options, "是否开启项目知识库？");
  applyPlan(plan);
  console.log(`已开启项目知识库：${plan.root}`);
}

function knowledgeStatus(options) {
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
  const state = readWorkspaceState(workspaceRoot);
  const status = collectKnowledgeStatus(workspaceRoot, state, options);
  if (options.json) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }
  printKnowledgeStatus(status);
}

function knowledgeCheck(options) {
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
  const state = readWorkspaceState(workspaceRoot);
  const status = collectKnowledgeStatus(workspaceRoot, state, options);
  const required = getKnowledgeRequiredEntries(status.root);
  const missing = required.filter((entry) => !status.structure[entry.key]);
  const emptyImportant = [];
  if (status.enabled || status.exists) {
    for (const entry of required.filter((item) => item.kind === "file" && ["index", "schema"].includes(item.key))) {
      const absolute = path.join(workspaceRoot, entry.path);
      if (fs.existsSync(absolute) && !fs.readFileSync(absolute, "utf8").trim()) {
        emptyImportant.push(entry.path);
      }
    }
  }
  const missingSkills = status.enabled || status.exists ? !status.skills.project_skill_installed : false;
  const ok = (!status.enabled && !status.exists) || (missing.length === 0 && emptyImportant.length === 0 && !missingSkills);
  const result = {
    ok,
    enabled: status.enabled,
    exists: status.exists,
    root: status.root,
    missing: missing.map((entry) => entry.path),
    empty: emptyImportant,
    skills: status.skills,
    legacy_candidates: status.legacy_candidates
  };
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
  if (!status.enabled && !status.exists) {
    console.log("这个项目还没有开启知识库。这不是问题；需要长期沉淀项目知识时再开启即可。");
    return result;
  }
  if (ok) {
    console.log(`项目知识库结构完整：${status.root}`);
  } else {
    console.log(`项目知识库需要补齐：${status.root}`);
    for (const item of result.missing) console.log(`- 缺少：${item}`);
    for (const item of result.empty) console.log(`- 内容为空：${item}`);
    if (missingSkills) console.log(`- 缺少项目内知识库助手：${status.skills.project_skill_ids.join("、")}`);
  }
  return result;
}

async function knowledgeApply(options) {
  if (!options.blueprint) {
    throw new Error("knowledge apply 需要 --blueprint <file>。");
  }
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
  const state = readWorkspaceState(workspaceRoot);
  assertProjectKnowledgeWorkspace(state);
  const blueprint = loadKnowledgeBlueprint(options.blueprint);
  const plan = buildKnowledgeApplyPlan({ workspaceRoot, state, blueprint });

  printGenericPlan(options.dryRun ? "知识库整理预览（dry run）：" : "知识库整理计划：", plan.actions);
  if (options.dryRun) return;
  await confirmOrThrow(options, "是否按知识库整理方案执行？");
  applyPlan(plan);
  console.log(`已应用知识库整理方案：${path.basename(blueprint.__path)}`);
}

function assertProjectKnowledgeWorkspace(state) {
  if (state.workspace_type === "hub") {
    throw new Error("项目知识库只用于具体项目工作台；项目中心共享知识库会在后续能力中单独设计。");
  }
}

function buildKnowledgeInitPlan({ workspaceRoot, state, language, root }) {
  const normalizedRoot = normalizeSafeRelativePath(root, "knowledge root").replace(/\/$/, "");
  const skillPlan = buildKnowledgeProjectSkillPlan({ targetDir: workspaceRoot, language, installedBy: "starwork knowledge init" });
  const existingSkills = readProjectSkillsManifest(workspaceRoot).skills;
  const actions = [
    ...buildKnowledgeStructureActions(workspaceRoot, language, normalizedRoot),
    ...buildKnowledgeRuleActions(workspaceRoot, language, normalizedRoot),
    ...skillPlan.actions,
    overwriteFileAction(workspaceRoot, path.join(".starwork", "workspace.json"), renderKnowledgeWorkspaceState(state, language, normalizedRoot)),
    overwriteFileAction(workspaceRoot, path.join(".starwork", "skills.json"), renderProjectSkillsManifest(mergeSkillRecords(existingSkills, skillPlan.records)))
  ];
  return {
    targetDir: workspaceRoot,
    language,
    root: normalizedRoot,
    actions: dedupeActions(actions)
  };
}

function buildKnowledgeStructureActions(workspaceRoot, language, root) {
  const actions = [directoryAction(workspaceRoot, root)];
  for (const directory of ["inbox", "sources", "pages", "synthesis"]) {
    actions.push(directoryAction(workspaceRoot, path.join(root, directory)));
  }
  for (const file of ["README.md", "index.md", "schema.md", "log.md"]) {
    actions.push(idempotentFileAction(workspaceRoot, path.join(root, file), loadKnowledgeTemplate(language, file)));
  }
  return actions;
}

function buildKnowledgeRuleActions(workspaceRoot, language, root) {
  const actions = [];
  const agentsPath = path.join(workspaceRoot, "AGENTS.md");
  if (fs.existsSync(agentsPath)) {
    const existing = fs.readFileSync(agentsPath, "utf8");
    const next = ensureRulesIndexReference(existing);
    if (next !== existing) {
      actions.push(overwriteFileAction(workspaceRoot, "AGENTS.md", next));
    }
  }
  actions.push(...buildRuleSlotActions(workspaceRoot, [{
    slot: "knowledge",
    title: language === "en" ? "Knowledge Base" : "知识库",
    group: language === "en" ? "StarWork Capability Rules" : "StarWork 能力规则",
    content: renderKnowledgeRule(language, root)
  }]));
  return actions;
}

function renderKnowledgeWorkspaceState(state, language, root) {
  const nextState = {
    ...state,
    language: state.language || language,
    capabilities: {
      ...(state.capabilities || {}),
      knowledge: renderKnowledgeCapabilityRecord(language, root)
    }
  };
  return `${JSON.stringify(nextState, null, 2)}\n`;
}

function renderKnowledgeCapabilityRecord(language, root) {
  return {
    enabled: true,
    root,
    language,
    mode: "local",
    version: "0.1",
    project_skill_ids: [KNOWLEDGE_PROJECT_SKILL_ID]
  };
}

function getKnowledgeDefaultRoot(language) {
  return language === "en" ? "knowledge-base" : "知识库";
}

function getKnowledgeTemplateDir(language) {
  return path.join(PRODUCT_ROOT, "core", "capabilities", "knowledge", "templates", language === "en" ? "en" : "zh");
}

function loadKnowledgeTemplate(language, file) {
  const templatePath = path.join(getKnowledgeTemplateDir(language), file);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`缺少知识库模板：${templatePath}`);
  }
  return fs.readFileSync(templatePath, "utf8");
}

function renderKnowledgeRule(language, root) {
  if (language === "en") {
    return `## Knowledge Base

When a task depends on long-term project knowledge, read \`${root}/index.md\` first.

Do not dump raw sources, temporary drafts, or one-off task notes into the knowledge base. Stable topics belong in \`${root}/pages/\`; cross-topic strategy, reviews, and synthesized judgment belong in \`${root}/synthesis/\`.
`;
  }
  return `## 知识库

如果任务需要复用本项目的长期知识，先读 \`${root}/index.md\`。

不要把原始资料、临时草稿或单次任务过程直接塞进知识库。新资料需要整理成稳定主题页，放入 \`${root}/pages/\`；跨主题的策略、复盘和综合判断放入 \`${root}/synthesis/\`。
`;
}

function collectKnowledgeStatus(workspaceRoot, state, options = {}) {
  const language = options.language || state.language || "zh";
  const declared = state.capabilities?.knowledge || {};
  const root = normalizeSafeRelativePath(options.path || declared.root || getKnowledgeDefaultRoot(language), "knowledge root").replace(/\/$/, "");
  const required = getKnowledgeRequiredEntries(root);
  const structure = {};
  for (const entry of required) {
    const absolute = path.join(workspaceRoot, entry.path);
    structure[entry.key] = entry.kind === "directory"
      ? fs.existsSync(absolute) && fs.statSync(absolute).isDirectory()
      : fs.existsSync(absolute) && fs.statSync(absolute).isFile();
  }
  const exists = fs.existsSync(path.join(workspaceRoot, root));
  const projectSkillIds = Array.isArray(declared.project_skill_ids) && declared.project_skill_ids.length
    ? declared.project_skill_ids
    : [KNOWLEDGE_PROJECT_SKILL_ID];
  const projectSkillsManifest = readProjectSkillsManifest(workspaceRoot);
  const projectSkillInstalled = projectSkillIds.every((id) => isProjectSkillInstalled(workspaceRoot, id));
  const projectSkillRegistered = projectSkillIds.every((id) => projectSkillsManifest.skills.some((skill) => skill.id === id));
  const legacyCandidates = ["知识", "knowledge", "资料库"]
    .filter((candidate) => candidate !== root && fs.existsSync(path.join(workspaceRoot, candidate)));
  const warnings = [];
  if (declared.enabled && !exists) {
    warnings.push(`workspace state 声明了知识库，但目录不存在：${root}`);
  }
  for (const entry of required) {
    if ((declared.enabled || exists) && !structure[entry.key]) {
      warnings.push(`缺少知识库结构：${entry.path}`);
    }
  }
  if ((declared.enabled || exists) && !projectSkillInstalled) {
    warnings.push(`缺少知识库项目内 Skill：${projectSkillIds.join(", ")}`);
  }
  return {
    ok: warnings.length === 0,
    enabled: Boolean(declared.enabled),
    exists,
    language,
    root,
    structure,
    counts: {
      pages: countDirectoryEntries(path.join(workspaceRoot, root, "pages")),
      synthesis: countDirectoryEntries(path.join(workspaceRoot, root, "synthesis")),
      inbox: countDirectoryEntries(path.join(workspaceRoot, root, "inbox")),
      sources: countDirectoryEntries(path.join(workspaceRoot, root, "sources"))
    },
    skills: {
      project_skill_installed: projectSkillInstalled,
      project_skill_ids: projectSkillIds,
      manifest_registered: projectSkillRegistered,
      mounts: {
        codex: projectSkillIds.every((id) => fs.existsSync(path.join(workspaceRoot, ".agents", "skills", id, "SKILL.md"))),
        claude: projectSkillIds.every((id) => fs.existsSync(path.join(workspaceRoot, ".claude", "skills", id, "SKILL.md")))
      }
    },
    legacy_candidates: legacyCandidates,
    warnings
  };
}

function isProjectSkillInstalled(workspaceRoot, skillId) {
  return fs.existsSync(path.join(workspaceRoot, ".agents", "skills", skillId, "SKILL.md"))
    || fs.existsSync(path.join(workspaceRoot, ".claude", "skills", skillId, "SKILL.md"));
}

function getKnowledgeRequiredEntries(root) {
  return [
    { key: "readme", kind: "file", path: path.join(root, "README.md") },
    { key: "index", kind: "file", path: path.join(root, "index.md") },
    { key: "schema", kind: "file", path: path.join(root, "schema.md") },
    { key: "log", kind: "file", path: path.join(root, "log.md") },
    { key: "inbox", kind: "directory", path: path.join(root, "inbox") },
    { key: "sources", kind: "directory", path: path.join(root, "sources") },
    { key: "pages", kind: "directory", path: path.join(root, "pages") },
    { key: "synthesis", kind: "directory", path: path.join(root, "synthesis") }
  ];
}

function countDirectoryEntries(directoryPath) {
  if (!fs.existsSync(directoryPath) || !fs.statSync(directoryPath).isDirectory()) return 0;
  return fs.readdirSync(directoryPath).filter((name) => name !== ".gitkeep").length;
}

function printKnowledgeStatus(status) {
  console.log("项目知识库状态");
  console.log("");
  console.log(`语言：${friendlyLanguage(status.language)}`);
  console.log(`路径：${status.root}`);
  console.log(`是否开启：${status.enabled ? "已开启" : "未开启"}`);
  console.log(`目录是否存在：${status.exists ? "存在" : "不存在"}`);
  if (status.legacy_candidates.length) {
    console.log(`检测到旧知识相关目录：${status.legacy_candidates.join("、")}`);
  }
  if (status.warnings.length) {
    console.log("");
    console.log("需要关注：");
    for (const warning of status.warnings) console.log(`- ${warning}`);
  }
}

function loadKnowledgeBlueprint(blueprintPath) {
  const filePath = path.resolve(blueprintPath);
  let blueprint;
  try {
    blueprint = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`无法读取 knowledge blueprint：${error.message}`);
  }
  if (blueprint.type !== "starwork.knowledge" || blueprint.version !== "0.1") {
    throw new Error("knowledge blueprint 必须声明 type=starwork.knowledge 且 version=0.1。");
  }
  if (!["zh", "en"].includes(blueprint.language)) {
    throw new Error("knowledge blueprint language 只支持 zh 或 en。");
  }
  if (!blueprint.root) {
    throw new Error("knowledge blueprint 缺少 root。");
  }
  if (!Array.isArray(blueprint.actions) || blueprint.actions.length === 0) {
    throw new Error("knowledge blueprint 必须包含 actions。");
  }
  for (const action of blueprint.actions) {
    if (KNOWLEDGE_BLUEPRINT_BANNED_ACTIONS.has(action?.type) || ["remove", "rm"].includes(action?.type)) {
      throw new Error(`knowledge blueprint 不允许 action.type：${action?.type}`);
    }
    if (!KNOWLEDGE_BLUEPRINT_ACTIONS.has(action?.type)) {
      throw new Error(`knowledge blueprint 不支持 action.type：${action?.type}`);
    }
    if (action.path) normalizeSafeRelativePath(action.path, `knowledge action ${action.type}.path`);
    if (action.from) normalizeSafeRelativePath(action.from, `knowledge action ${action.type}.from`);
    if (action.to) normalizeSafeRelativePath(action.to, `knowledge action ${action.type}.to`);
  }
  return { ...blueprint, __path: filePath, __dir: path.dirname(filePath) };
}

function buildKnowledgeApplyPlan({ workspaceRoot, state, blueprint }) {
  const root = normalizeSafeRelativePath(blueprint.root, "knowledge root").replace(/\/$/, "");
  const actions = [];
  const existingSkills = readProjectSkillsManifest(workspaceRoot).skills;
  const skillPlans = [];
  let shouldRecordCapability = false;
  for (const action of blueprint.actions) {
    if (action.type === "create_knowledge_base") {
      actions.push(...buildKnowledgeStructureActions(workspaceRoot, blueprint.language, normalizeSafeRelativePath(action.path || root, "knowledge action path").replace(/\/$/, "")));
      shouldRecordCapability = true;
    } else if (action.type === "create_dir") {
      actions.push(directoryAction(workspaceRoot, normalizeSafeRelativePath(action.path, "knowledge create_dir.path")));
    } else if (action.type === "write_template") {
      const targetPath = normalizeSafeRelativePath(action.path, "knowledge write_template.path");
      const content = loadKnowledgeNamedTemplate(action.template, blueprint.language);
      actions.push(action.overwrite === true ? overwriteFileAction(workspaceRoot, targetPath, content) : fileAction(workspaceRoot, targetPath, content));
    } else if (action.type === "append_agents_rule") {
      actions.push(...buildKnowledgeRuleActions(workspaceRoot, blueprint.language, root));
    } else if (action.type === "install_project_skill") {
      const skillPlan = buildKnowledgeProjectSkillPlan({ targetDir: workspaceRoot, language: blueprint.language, installedBy: "starwork knowledge apply" });
      actions.push(...skillPlan.actions);
      skillPlans.push(skillPlan);
      shouldRecordCapability = true;
    } else if (action.type === "copy_preserved_file") {
      if (action.confirmed !== true) throw new Error("knowledge copy_preserved_file 需要 confirmed=true。");
      const from = resolveWorkspaceSourceFile(workspaceRoot, action.from, "knowledge copy_preserved_file.from");
      const to = normalizeSafeRelativePath(action.to, "knowledge copy_preserved_file.to");
      actions.push(strictFileAction(workspaceRoot, to, fs.readFileSync(from, "utf8")));
    } else if (action.type === "record_workspace_capability") {
      shouldRecordCapability = true;
    } else {
      throw new Error(`knowledge blueprint 不支持 action.type：${action.type}`);
    }
  }
  if (shouldRecordCapability) {
    actions.push(overwriteFileAction(workspaceRoot, path.join(".starwork", "workspace.json"), renderKnowledgeWorkspaceState(state, blueprint.language, root)));
  }
  if (skillPlans.length) {
    actions.push(overwriteFileAction(
      workspaceRoot,
      path.join(".starwork", "skills.json"),
      renderProjectSkillsManifest(mergeSkillRecords(existingSkills, skillPlans.flatMap((plan) => plan.records)))
    ));
  }
  return {
    targetDir: workspaceRoot,
    root,
    language: blueprint.language,
    actions: dedupeActions(actions)
  };
}

function loadKnowledgeNamedTemplate(template, language) {
  const normalized = template || "";
  const mapping = {
    [`knowledge.readme.${language}`]: "README.md",
    [`knowledge.index.${language}`]: "index.md",
    [`knowledge.schema.${language}`]: "schema.md",
    [`knowledge.log.${language}`]: "log.md"
  };
  const file = mapping[normalized] || mapping[normalized.replace(/\.(zh|en)$/, `.${language}`)];
  if (!file) {
    throw new Error(`未知知识库模板：${template}`);
  }
  return loadKnowledgeTemplate(language, file);
}

function resolveAdapterHosts(input) {
  const raw = input || "codex";
  if (raw === "all") return Object.keys(ADAPTERS);
  const normalized = ADAPTER_ALIASES[raw];
  if (!normalized || !ADAPTERS[normalized]) {
    throw new Error(`不支持的宿主适配目标：${raw}`);
  }
  return [normalized];
}

function loadAdapterProfile(host) {
  const normalized = ADAPTER_ALIASES[host] || host;
  const config = ADAPTERS[normalized];
  if (!config) throw new Error(`不支持的宿主适配目标：${host}`);
  const profilePath = path.join(PRODUCT_ROOT, config.profile);
  let profile;
  try {
    profile = JSON.parse(fs.readFileSync(profilePath, "utf8"));
  } catch (error) {
    throw new Error(`无法读取 adapter profile：${config.profile}：${error.message}`);
  }
  validateAdapterProfile(profile, config.profile);
  return profile;
}

function validateAdapterProfile(profile, sourceLabel = "profile") {
  if (profile.schema !== "starwork.adapter.profile.v0.1") {
    throw new Error(`${sourceLabel} schema 不正确。`);
  }
  if (!profile.host || !ADAPTERS[profile.host]) {
    throw new Error(`${sourceLabel} host 不正确。`);
  }
  validateAdapterCapabilityField(profile.rules, ["can_generate_entry", "can_update_entry", "supports_project_scope", "supports_nested_rules"], `${sourceLabel}.rules`);
  validateAdapterCapabilityField(profile.skills, ["system_install", "project_mount", "discovery"], `${sourceLabel}.skills`);
  validateAdapterCapabilityField(profile.sessions, Object.keys(profile.sessions || {}), `${sourceLabel}.sessions`);
  validateAdapterCapabilityField(profile.memory, Object.keys(profile.memory || {}), `${sourceLabel}.memory`);
  validateAdapterCapabilityField(profile.commands, Object.keys(profile.commands || {}), `${sourceLabel}.commands`);
  const skills = profile.skills || {};
  for (const field of ["project_mount_dirs", "host_native_dirs", "conflict_priority"]) {
    if (!Array.isArray(skills[field])) {
      throw new Error(`${sourceLabel}.skills.${field} 必须是数组。`);
    }
  }
  if (!skills.primary_project_dir || typeof skills.discovery !== "string") {
    throw new Error(`${sourceLabel}.skills 缺少 primary_project_dir 或 discovery。`);
  }
  if (typeof skills.adapter_rule_required !== "boolean") {
    throw new Error(`${sourceLabel}.skills.adapter_rule_required 必须是布尔值。`);
  }
}

function validateAdapterCapabilityField(object, keys, label) {
  for (const key of keys) {
    const value = object?.[key];
    if (!ADAPTER_CAPABILITY_LEVELS.has(value)) {
      throw new Error(`${label}.${key} 使用了非标准能力等级：${value}`);
    }
  }
}

function collectAdapterCapabilities(hosts) {
  return {
    schema: "starwork.adapter.capabilities.v0.1",
    generated_at: new Date().toISOString(),
    hosts: hosts.map(loadAdapterProfile)
  };
}

function printAdapterCapabilities(capabilities) {
  console.log("StarWork Host Adapter 能力");
  console.log("");
  for (const profile of capabilities.hosts) {
    console.log(`${profile.label}（${profile.host}）`);
    console.log(`- 规则入口：${profile.rules.entry_file || "无"}`);
    console.log(`- 项目 Skill 目录：${profile.skills.project_mount_dirs.join("、")}`);
    console.log(`- Skill 发现：${friendlyCapabilityLevel(profile.skills.discovery)}`);
    console.log(`- 会话读取：${friendlyCapabilityLevel(profile.sessions.read)}`);
    console.log(`- 跨会话发送：${friendlyCapabilityLevel(profile.sessions.send_message)}`);
    console.log(`- 创建会话：${friendlyCapabilityLevel(profile.sessions.create)}`);
    if (profile.safety.degradation_required?.length) {
      console.log(`- 必须降级处理：${profile.safety.degradation_required.join("、")}`);
    }
    console.log("");
  }
}

function friendlyCapabilityLevel(level) {
  const labels = {
    supported: "支持自动执行",
    partial: "部分支持，需要复核",
    manual: "需要人工操作",
    unsupported: "不支持",
    unknown: "尚未确认"
  };
  return labels[level] || level;
}

function buildAdaptPlan({ workspaceRoot, state, hosts, agentDocsMode = "draft", agentDocsEntriesSeed = [] }) {
  const actions = [];
  const profiles = hosts.map(loadAdapterProfile);
  const installations = [];
  const agentDocsEntries = [];
  for (const profile of profiles) {
    let rulesEntry = profile.rules.entry_file || null;
    let generatedEntries = [];
    let rulesEntryStatus = profile.rules.entry_file ? "missing" : "not_applicable";
    let draftEntry = null;
    if (profile.rules.entry_file) {
      const entryPlan = adapterEntryPlan(workspaceRoot, profile, renderAdapterContent(profile, state), agentDocsMode);
      actions.push(entryPlan.action);
      rulesEntry = entryPlan.rulesEntry;
      generatedEntries = entryPlan.generatedEntry ? [entryPlan.generatedEntry] : [];
      rulesEntryStatus = entryPlan.rulesEntryStatus;
      draftEntry = entryPlan.draftEntry;
      if (entryPlan.agentDocsEntry) {
        agentDocsEntries.push(entryPlan.agentDocsEntry);
      }
    }
    for (const dir of profile.skills.project_mount_dirs) {
      actions.push(directoryAction(workspaceRoot, dir));
    }
    installations.push({ profile, rulesEntry, generatedEntries, rulesEntryStatus, draftEntry });
  }
  const agentDocsPlanAction = buildAgentDocsPlanAction(workspaceRoot, "adapt", agentDocsEntries, agentDocsEntriesSeed);
  if (agentDocsPlanAction) {
    actions.push(agentDocsPlanAction);
  }

  const nextAdaptersState = mergeAdaptersState(readAdaptersState(workspaceRoot), installations);
  const nextWorkspaceState = renderWorkspaceAdaptersSummary(state, installations);
  actions.push(overwriteFileAction(workspaceRoot, path.join(".starwork", "adapters.json"), `${JSON.stringify(nextAdaptersState, null, 2)}\n`));
  actions.push(overwriteFileAction(workspaceRoot, path.join(".starwork", "workspace.json"), `${JSON.stringify(nextWorkspaceState, null, 2)}\n`));

  return {
    targetDir: workspaceRoot,
    actions: dedupeActions(actions),
    agentDocs: agentDocsEntries.length || agentDocsEntriesSeed.length ? { status: "draft_required", entries: mergeAgentDocsEntries(agentDocsEntriesSeed, agentDocsEntries) } : null
  };
}

function adapterEntryPlan(workspaceRoot, profile, content, agentDocsMode = "draft") {
  const relativePath = profile.rules.entry_file;
  const absolute = path.join(workspaceRoot, relativePath);
  if (agentDocsMode === "skip") {
    return {
      action: { type: "file", mode: "skip", target: absolute, relativePath, content: "" },
      rulesEntry: normalizeRelativePath(relativePath),
      generatedEntry: null,
      rulesEntryStatus: "missing",
      draftEntry: null,
      agentDocsEntry: null
    };
  }
  if (!fs.existsSync(absolute)) {
    return {
      action: overwriteFileAction(workspaceRoot, relativePath, content),
      rulesEntry: normalizeRelativePath(relativePath),
      generatedEntry: normalizeRelativePath(relativePath),
      rulesEntryStatus: "active",
      draftEntry: null,
      agentDocsEntry: null
    };
  }
  const existing = fs.readFileSync(absolute, "utf8");
  if (!existing.trim() || existing.includes(ADAPTER_ENTRY_MARKER)) {
    return {
      action: overwriteFileAction(workspaceRoot, relativePath, content),
      rulesEntry: normalizeRelativePath(relativePath),
      generatedEntry: normalizeRelativePath(relativePath),
      rulesEntryStatus: "active",
      draftEntry: null,
      agentDocsEntry: null
    };
  }
  if (agentDocsMode === "write") {
    throw new Error(`${relativePath} 已有用户内容，--agent-docs write 不能覆盖；请改用 --agent-docs draft 并由 starworkInit 整合。`);
  }
  const draftEntry = adapterDraftPath(profile.host);
  return {
    action: upsertFileAction(workspaceRoot, draftEntry, content),
    rulesEntry: normalizeRelativePath(relativePath),
    generatedEntry: draftEntry,
    rulesEntryStatus: "pending_merge",
    draftEntry,
    agentDocsEntry: buildAgentDocsEntry({
      kind: "agent_rules",
      host: profile.host,
      targetPath: relativePath,
      targetExists: true,
      draftPath: draftEntry,
      action: "merge_required",
      reason: `Existing ${relativePath} must be preserved and semantically integrated.`
    })
  };
}

function readAdaptersState(workspaceRoot) {
  const statePath = path.join(workspaceRoot, ".starwork", "adapters.json");
  if (!fs.existsSync(statePath)) {
    return { schema: ADAPTER_STATE_SCHEMA, updated_at: null, adapters: {} };
  }
  try {
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    if (!state.adapters || typeof state.adapters !== "object" || Array.isArray(state.adapters)) {
      state.adapters = {};
    }
    return state;
  } catch {
    return { schema: ADAPTER_STATE_SCHEMA, updated_at: null, adapters: {} };
  }
}

function mergeAdaptersState(existingState, installations) {
  const now = new Date().toISOString();
  const next = {
    schema: ADAPTER_STATE_SCHEMA,
    updated_at: now,
    adapters: { ...(existingState.adapters || {}) }
  };
  for (const installation of installations) {
    const { profile, rulesEntry, generatedEntries, rulesEntryStatus, draftEntry } = installation;
    next.adapters[profile.host] = {
      enabled: rulesEntryStatus === "active",
      rules_entry: rulesEntry,
      rules_entry_status: rulesEntryStatus,
      ...(draftEntry ? { draft_entry: draftEntry } : {}),
      profile_version: profile.version || "0.1",
      installed_by: `starwork adapt ${profile.host}`,
      installed_at: next.adapters[profile.host]?.installed_at || now,
      updated_at: now,
      capabilities: selectAdapterCapabilitySummary(profile),
      skill_mount_dirs: profile.skills.project_mount_dirs,
      last_probe: {
        status: "not_run",
        observed_at: now,
        facts: [],
        warnings: []
      },
      generated_entries: generatedEntries
    };
  }
  return next;
}

function selectAdapterCapabilitySummary(profile) {
  return {
    "rules.entry_file": profile.rules.entry_file,
    "skills.discovery": profile.skills.discovery,
    "sessions.detect_current": profile.sessions.detect_current,
    "sessions.read": profile.sessions.read,
    "sessions.continue": profile.sessions.continue,
    "sessions.send_message": profile.sessions.send_message,
    "sessions.create": profile.sessions.create,
    "memory.transcript_read": profile.memory.transcript_read
  };
}

function renderWorkspaceAdaptersSummary(state, installations) {
  const existing = state.adapters;
  const summary = Array.isArray(existing)
    ? Object.fromEntries(existing.filter((item) => item && item.id).map((item) => [ADAPTER_ALIASES[item.id] || item.id, {
      installed_at: item.installed_at,
      entry: item.entry
    }]))
    : { ...(existing || {}) };
  const now = new Date().toISOString();
  for (const installation of installations) {
    const { profile, rulesEntry, rulesEntryStatus, draftEntry } = installation;
    summary[profile.host] = {
      installed_at: summary[profile.host]?.installed_at || now,
      updated_at: now,
      rules_entry: rulesEntry,
      rules_entry_status: rulesEntryStatus,
      ...(draftEntry ? { draft_entry: draftEntry } : {}),
      profile_version: profile.version || "0.1"
    };
  }
  return { ...state, adapters: summary };
}

function renderAdapterContent(profile, state) {
  const rolePaths = getCoreRolePaths(state);
  const adapterName = profile.label;
  const skillDirs = profile.skills.project_mount_dirs.map((dir) => `- ${dir}`).join("\n");
  if (profile.host === "cursor") {
    return `---\ndescription: StarWork workspace rules\nalwaysApply: true\n---\n\n# StarWork Adapter for ${adapterName}\n\n<!-- ${ADAPTER_ENTRY_MARKER} host=${profile.host} -->\n\nThis workspace follows StarWork Core ${state.core || "0.1"}.\n\nRead first:\n\n1. AGENTS.md\n2. ${rolePaths.projectStatus}\n3. ${rolePaths.currentWork}\n4. .starwork/workspace.json\n5. .starwork/skills.json\n\nProject Skill directories for Cursor:\n\n${skillDirs}\n\nFollow AGENTS.md as the source of truth. Cursor can discover project Skills, but .starwork/skills.json remains the StarWork Skill fact source.\n`;
  }
  if (profile.host === "trae") {
    return `# StarWork Adapter for ${adapterName}\n\n<!-- ${ADAPTER_ENTRY_MARKER} host=${profile.host} -->\n\nThis workspace follows StarWork Core ${state.core || "0.1"}.\n\n## Read First\n\n1. AGENTS.md\n2. ${rolePaths.projectStatus}\n3. ${rolePaths.currentWork}\n4. .starwork/workspace.json\n5. .starwork/skills.json\n\n## Project Skill Directories\n\n${skillDirs}\n\n## Host Boundary\n\nTrae can discover project Skills, but .starwork/skills.json remains the StarWork Skill fact source. Trae does not support automatic StarWork background cross-session instruction delivery in v0.1; use manual handoff when needed.\n`;
  }
  return `# StarWork Adapter for ${adapterName}\n\n<!-- ${ADAPTER_ENTRY_MARKER} host=${profile.host} -->\n\nThis workspace follows StarWork Core ${state.core || "0.1"}.\n\n## Read First\n\n1. AGENTS.md\n2. ${rolePaths.projectStatus}\n3. ${rolePaths.currentWork}\n4. .starwork/workspace.json\n5. .starwork/skills.json\n\n## Project Skill Directories\n\n${skillDirs}\n\n## Rule\n\nAGENTS.md is the source of truth. This file is only an adapter entrypoint for ${adapterName}.\n\nDo not overwrite user content silently. When unsure, ask before changing identity, lessons, shared knowledge, formal outputs, or synced repository content.\n`;
}

function normalizeAgentDocsMode(value) {
  const mode = value || "draft";
  if (["draft", "skip", "write"].includes(mode)) return mode;
  throw new Error(`--agent-docs 只支持 draft、skip、write：${value}`);
}

function isAgentEntryDoc(relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  return ["AGENTS.md", "README.md", "CLAUDE.md"].includes(normalized);
}

function maybeAgentDocDraftAction(targetDir, relativePath, content, agentDocsMode) {
  if (!isAgentEntryDoc(relativePath)) return null;
  if (agentDocsMode === "skip") return { skip: true };
  const targetPath = path.join(targetDir, relativePath);
  if (!fs.existsSync(targetPath)) return null;
  const existing = fs.readFileSync(targetPath, "utf8");
  if (!existing.trim() || existing.includes(ADAPTER_ENTRY_MARKER) || existing.includes("STARWORK:")) return null;
  if (agentDocsMode === "write") {
    throw new Error(`${relativePath} 已有用户内容，--agent-docs write 不能覆盖；请改用 --agent-docs draft 并由 starworkInit 整合。`);
  }
  const draftPath = agentDocDraftPath(relativePath);
  return {
    action: upsertFileAction(targetDir, draftPath, content),
    entry: buildAgentDocsEntry({
      kind: relativePath === "README.md" ? "readme" : "agent_rules",
      targetPath: relativePath,
      targetExists: true,
      draftPath,
      action: "merge_required",
      reason: `Existing ${relativePath} must be preserved and semantically integrated.`
    })
  };
}

function agentDocDraftPath(relativePath) {
  const parsed = path.parse(relativePath);
  return normalizeRelativePath(path.join(AGENT_DOCS_DRAFT_DIR, `${parsed.name}.proposed${parsed.ext || ".md"}`));
}

function adapterDraftPath(host) {
  return normalizeRelativePath(path.join(AGENT_DOCS_DRAFT_DIR, `adapter.${host}.proposed.md`));
}

function buildAgentDocsEntry({ kind, host = null, targetPath, targetExists, draftPath, action, reason }) {
  return {
    kind,
    ...(host ? { host } : {}),
    target_path: normalizeRelativePath(targetPath),
    target_exists: Boolean(targetExists),
    draft_path: normalizeRelativePath(draftPath),
    action,
    reason,
    required_topics: [
      "StarWork read-first files",
      "workspace write boundaries",
      "project Skill directories",
      "MultiAgent lane workflow"
    ]
  };
}

function buildAgentDocsPlanAction(workspaceRoot, context, entries, seedEntries = []) {
  if (!entries.length && !seedEntries.length) return null;
  const existing = readAgentDocsPlan(workspaceRoot);
  const mergedEntries = mergeAgentDocsEntries(mergeAgentDocsEntries(existing.entries || [], seedEntries), entries);
  const plan = {
    schema: AGENT_DOCS_PLAN_SCHEMA,
    generated_at: new Date().toISOString(),
    target: workspaceRoot,
    context,
    status: "draft_required",
    entries: mergedEntries
  };
  return upsertFileAction(workspaceRoot, path.join(AGENT_DOCS_DRAFT_DIR, "agent-docs-plan.json"), `${JSON.stringify(plan, null, 2)}\n`);
}

function readAgentDocsPlan(workspaceRoot) {
  const planPath = path.join(workspaceRoot, AGENT_DOCS_DRAFT_DIR, "agent-docs-plan.json");
  if (!fs.existsSync(planPath)) return { entries: [] };
  try {
    const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
    return Array.isArray(plan.entries) ? plan : { entries: [] };
  } catch {
    return { entries: [] };
  }
}

function mergeAgentDocsEntries(existingEntries, newEntries) {
  const byKey = new Map();
  for (const entry of [...existingEntries, ...newEntries]) {
    if (!entry?.target_path || !entry?.draft_path) continue;
    byKey.set(`${entry.host || ""}:${entry.target_path}:${entry.draft_path}`, entry);
  }
  return [...byKey.values()];
}

function hasAgentDocsDrafts(workspaceRoot) {
  return fs.existsSync(path.join(workspaceRoot, AGENT_DOCS_DRAFT_DIR, "agent-docs-plan.json"));
}

function buildPackInstallPlan({ workspaceRoot, state, pack }) {
  const variables = {
    workspace: {
      name: path.basename(workspaceRoot),
      type: state.workspace_type
    },
    pack,
    paths: pack.paths || {},
    overrides: pack.overrides || {}
  };
  const actions = [];

  for (const rolePath of Object.values(pack.paths || {})) {
    actions.push(directoryAction(workspaceRoot, rolePath));
  }
  actions.push(...buildPackDirectoryActions(workspaceRoot, pack, variables));

  for (const seed of pack.seed || []) {
    const source = path.join(pack.__dir, seed.from);
    if (!fs.existsSync(source)) {
      throw new Error(`Pack seed 不存在：${pack.id}/${seed.from}`);
    }
    const content = renderText(fs.readFileSync(source, "utf8"), variables);
    actions.push(fileAction(workspaceRoot, seed.to, content));
  }

  for (const template of pack.templates || []) {
    const source = path.join(pack.__dir, template.from);
    if (!fs.existsSync(source)) {
      throw new Error(`Pack template 不存在：${pack.id}/${template.from}`);
    }
    const target = path.join(".starwork", "packs", pack.id, "templates", path.basename(template.from));
    const content = renderText(fs.readFileSync(source, "utf8"), variables);
    actions.push(fileAction(workspaceRoot, target, content));
  }

  const agentsPath = path.join(workspaceRoot, "AGENTS.md");
  if (!fs.existsSync(agentsPath)) {
    throw new Error("缺少 AGENTS.md，无法安装 Pack 规则。");
  }
  const agents = fs.readFileSync(agentsPath, "utf8");
  const packRuleSlots = renderPackRuleSlots(pack, variables, "场景规则");
  const nextAgents = ensureRulesIndexReference(agents);
  if (nextAgents !== agents) {
    actions.push(overwriteFileAction(workspaceRoot, "AGENTS.md", nextAgents));
  }
  actions.push(...buildRuleSlotActions(workspaceRoot, packRuleSlots));

  const nextState = {
    ...state,
    packs: [
      ...(Array.isArray(state.packs) ? state.packs : []),
      {
        id: pack.id,
        version: pack.version || "0.1.0",
        paths: pack.paths || {},
        installed_at: new Date().toISOString()
      }
    ],
    paths: {
      ...(state.paths || {}),
      formal_source: pack.overrides?.formal_source || state.paths?.formal_source,
      business_work_area: pack.overrides?.business_work_area || state.paths?.business_work_area
    }
  };
  actions.push(overwriteFileAction(workspaceRoot, path.join(".starwork", "workspace.json"), `${JSON.stringify(nextState, null, 2)}\n`));

  return {
    targetDir: workspaceRoot,
    actions: dedupeActions(actions)
  };
}

function loadInitBlueprint(blueprintPath) {
  const filePath = path.resolve(blueprintPath);
  let blueprint;
  try {
    blueprint = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`无法读取 init blueprint：${error.message}`);
  }
  if (blueprint.schema !== "starwork.init_blueprint.v0.1") {
    throw new Error("init blueprint schema 必须是 starwork.init_blueprint.v0.1。");
  }
  if (!blueprint.name || typeof blueprint.name !== "string") {
    throw new Error("init blueprint 缺少工作台名称 name。");
  }
  if (!["project", "hub", "single-light"].includes(blueprint.workspace_type)) {
    throw new Error("init blueprint workspace_type 只支持 project、hub 或 single-light 兼容别名。");
  }
  if (blueprint.kit && normalizeKitId(blueprint.kit) !== normalizeKitId(WORKSPACE_TYPES[normalizeWorkspaceType(blueprint.workspace_type)]?.kit)) {
    throw new Error(`init blueprint kit (${blueprint.kit}) 与 workspace_type (${blueprint.workspace_type}) 不匹配。`);
  }
  if (!["zh", "en"].includes(blueprint.language)) {
    throw new Error("init blueprint language 只支持 zh 或 en。");
  }
  if (blueprint.pack && typeof blueprint.pack !== "string") {
    throw new Error("init blueprint pack 必须是字符串。");
  }
  for (const relativePath of Object.values(blueprint.paths || {})) {
    normalizeSafeRelativePath(relativePath, "init blueprint paths");
  }
  for (const directory of blueprint.directories || []) {
    if (!directory?.path || typeof directory.path !== "string") {
      throw new Error("init blueprint directories 每一项都必须包含 path。");
    }
    normalizeSafeRelativePath(directory.path, "init blueprint directories.path");
    if (directory.purpose != null && typeof directory.purpose !== "string") {
      throw new Error("init blueprint directories.purpose 必须是字符串。");
    }
    if (directory.write_policy != null && typeof directory.write_policy !== "string") {
      throw new Error("init blueprint directories.write_policy 必须是字符串。");
    }
  }
  for (const folder of blueprint.folders || []) {
    normalizeSafeRelativePath(folder, "init blueprint folders");
  }
  for (const removal of blueprint.removals || []) {
    validateInitBlueprintRemoval(removal);
  }
  for (const rule of blueprint.agent_rules || []) {
    if (!rule?.slot || typeof rule.slot !== "string") {
      throw new Error("init blueprint agent_rules 每一项都必须包含 slot。");
    }
    normalizeSafeSourcePath(rule.from, path.dirname(filePath), "init blueprint agent_rules.from");
  }
  for (const seed of blueprint.seed || []) {
    normalizeSafeSourcePath(seed.from, path.dirname(filePath), "init blueprint seed.from");
    normalizeSafeRelativePath(seed.to, "init blueprint seed.to");
    const conflict = seed.on_conflict || "error";
    if (!["error", "skip", "create_new"].includes(conflict)) {
      throw new Error("init blueprint seed.on_conflict 只支持 error、skip 或 create_new。");
    }
  }
  return {
    ...blueprint,
    pack: blueprint.pack || WORKSPACE_TYPES[normalizeWorkspaceType(blueprint.workspace_type)].defaultPack,
    __path: filePath,
    __dir: path.dirname(filePath)
  };
}

function validateInitBlueprintForWorkspace(blueprint, workspaceType, workspaceConfig) {
  if (!blueprint) return;
  const blueprintType = normalizeWorkspaceType(blueprint.workspace_type);
  if (blueprintType !== workspaceType) {
    throw new Error(`init blueprint workspace_type (${blueprint.workspace_type}) 与本次 init 类型 (${workspaceType}) 不一致。`);
  }
  if (normalizeKitId(blueprint.kit || workspaceConfig.kit) !== normalizeKitId(workspaceConfig.kit)) {
    throw new Error(`init blueprint kit (${blueprint.kit}) 与工作区类型 ${workspaceType} 的 Kit (${workspaceConfig.kit}) 不匹配。`);
  }
  if (workspaceType === "hub" && (
    Object.keys(blueprint.paths || {}).length
    || (blueprint.directories || []).length
    || (blueprint.folders || []).length
    || (blueprint.removals || []).length
    || (blueprint.agent_rules || []).length
    || (blueprint.seed || []).length
  )) {
    throw new Error("init blueprint v0.1 暂不支持定制项目中心目录。项目中心请使用标准 init。");
  }
}

function resolveInitPackPaths(pack, blueprint, { formalSource, businessWorkArea }) {
  const paths = { ...(pack.paths || {}) };
  if (!blueprint) return paths;
  for (const [key, value] of Object.entries(blueprint.paths || {})) {
    if (key === "formal_source" || key === "business_work_area") continue;
    paths[key] = normalizeSafeRelativePath(value, `init blueprint paths.${key}`);
  }
  if (paths.final && formalSource) {
    paths.final = normalizeSafeRelativePath(formalSource, "paths.formal_source");
  }
  if (paths.drafts && businessWorkArea) {
    paths.drafts = normalizeSafeRelativePath(businessWorkArea, "paths.business_work_area");
  }
  if (paths.references && !blueprint.paths?.references && matchesAnyRemovedPath(paths.references, blueprint.removals || [])) {
    paths.references = normalizeSafeRelativePath(businessWorkArea, "paths.business_work_area");
  }
  return paths;
}

function buildPackDirectoryActions(targetDir, pack, variables) {
  const actions = [];
  const directories = Array.isArray(pack.directories) ? pack.directories : [];
  for (const directory of directories) {
    const relativePath = normalizeSafeRelativePath(directory.path || pack.paths?.[directory.id], `pack ${pack.id} directories.path`);
    actions.push(directoryAction(targetDir, relativePath));
    if (directory.readme) {
      actions.push(fileAction(targetDir, path.join(relativePath, "README.md"), renderText(directory.readme, variables)));
    }
  }
  return actions;
}

function renderInitBlueprintRuleSlots(blueprint, variables) {
  if (!blueprint) return [];
  const slots = [];
  for (const rule of blueprint.agent_rules || []) {
    const source = normalizeSafeSourcePath(rule.from, blueprint.__dir, "init blueprint agent_rules.from");
    const content = renderText(fs.readFileSync(source, "utf8"), variables).trim();
    if (!content) continue;
    slots.push({
      slot: rule.slot,
      group: "初始化定制规则",
      content
    });
  }
  return slots;
}

function buildInitBlueprintSeedActions(targetDir, blueprint, variables) {
  if (!blueprint) return [];
  const actions = [];
  for (const seed of blueprint.seed || []) {
    const source = normalizeSafeSourcePath(seed.from, blueprint.__dir, "init blueprint seed.from");
    const target = normalizeSafeRelativePath(seed.to, "init blueprint seed.to");
    const targetPath = path.join(targetDir, target);
    if (fs.existsSync(targetPath) && (seed.on_conflict || "error") === "skip") continue;
    if (fs.existsSync(targetPath) && (seed.on_conflict || "error") === "error") {
      throw new Error(`init blueprint seed 目标已存在：${target}`);
    }
    const content = renderText(fs.readFileSync(source, "utf8"), variables);
    actions.push((seed.on_conflict || "error") === "create_new"
      ? fileAction(targetDir, target, content)
      : strictFileAction(targetDir, target, content));
  }
  return actions;
}

function matchesAnyRemovedPath(relativePath, removals = []) {
  const normalizedPath = normalizeRelativePath(relativePath);
  return (removals || []).some((removal) => {
    const normalizedRemoval = normalizeSafeRelativePath(removal, "init blueprint removals");
    const prefix = normalizedRemoval.endsWith("/") ? normalizedRemoval : `${normalizedRemoval}/`;
    return normalizedPath === normalizedRemoval.replace(/\/$/, "") || normalizedPath.startsWith(prefix);
  });
}

function validateInitBlueprintRemoval(removal) {
  const normalized = normalizeSafeRelativePath(removal, "init blueprint removals").replace(/\/$/, "");
  const protectedPaths = [
    ".starwork",
    ".agents",
    ".claude",
    "AGENTS.md",
    "CLAUDE.md",
    "README.md",
    "_系统",
    "_system"
  ];
  if (protectedPaths.some((protectedPath) => normalized === protectedPath || normalized.startsWith(`${protectedPath}/`))) {
    throw new Error(`init blueprint removals 不能跳过 StarWork 机制文件：${removal}`);
  }
}

function loadUpgradeBlueprint(blueprintPath) {
  const filePath = path.resolve(blueprintPath);
  let blueprint;
  try {
    blueprint = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`无法读取 upgrade blueprint：${error.message}`);
  }
  if (blueprint.schema !== "starwork.upgrade_blueprint.v0.1") {
    throw new Error("upgrade blueprint schema 必须是 starwork.upgrade_blueprint.v0.1。");
  }
  if (!blueprint.base || typeof blueprint.base !== "object") {
    throw new Error("upgrade blueprint 缺少 base 配置。");
  }
  const workspaceType = blueprint.base.workspace_type;
  const kit = blueprint.base.kit;
  const allowedKits = {
    project: "project",
    "single-light": "local-starter",
    hub: "hub"
  };
  if (!allowedKits[workspaceType]) {
    throw new Error("upgrade blueprint base.workspace_type 只支持 project、hub 或 single-light 兼容别名。");
  }
  if (normalizeKitId(kit) !== normalizeKitId(allowedKits[workspaceType])) {
    throw new Error(`upgrade blueprint base.kit (${kit}) 与 ${workspaceType} 不匹配，应为 ${allowedKits[workspaceType]}。`);
  }
  if (Object.hasOwn(blueprint.base, "pack") && blueprint.base.pack !== null && typeof blueprint.base.pack !== "string") {
    throw new Error("upgrade blueprint base.pack 必须是字符串或 null。");
  }
  if (blueprint.base.pack === null && workspaceType !== "hub") {
    throw new Error("upgrade blueprint 只有 hub 工作区允许 base.pack 为 null。");
  }
  if (!["zh", "en"].includes(blueprint.base.language)) {
    throw new Error("upgrade blueprint base.language 只支持 zh 或 en。");
  }
  if (!["preserve-names", "add-standard-shell", "standardize-empty-paths"].includes(blueprint.strategy)) {
    throw new Error("upgrade blueprint strategy 暂只支持 preserve-names、add-standard-shell 或 standardize-empty-paths。");
  }
  if (!blueprint.paths?.formal_source || !blueprint.paths?.business_work_area) {
    throw new Error("upgrade blueprint 缺少 paths.formal_source 或 paths.business_work_area。");
  }
  normalizeSafeRelativePath(blueprint.paths.formal_source, "upgrade paths.formal_source");
  normalizeSafeRelativePath(blueprint.paths.business_work_area, "upgrade paths.business_work_area");
  if (!Array.isArray(blueprint.actions) || blueprint.actions.length === 0) {
    throw new Error("upgrade blueprint 必须包含 actions。");
  }
  validateUpgradeBlueprintActions(blueprint, path.dirname(filePath));
  for (const preserved of blueprint.preserve || []) {
    normalizeSafeRelativePath(preserved, "upgrade preserve");
  }
  return {
    ...blueprint,
    __path: filePath,
    __dir: path.dirname(filePath)
  };
}

function validateUpgradeBlueprintActions(blueprint, blueprintDir) {
  const supported = new Set([
    "ensure_dir",
    "write_workspace_state",
    "copy_kit_missing_files",
    "inject_agent_rules",
    "write_file",
    "copy_seed"
  ]);
  for (const action of blueprint.actions) {
    if (!supported.has(action?.type)) {
      throw new Error(`upgrade blueprint 不支持 action.type：${action?.type || "(missing)"}`);
    }
    if (action.path) {
      normalizeSafeRelativePath(action.path, `upgrade action ${action.type}.path`);
    }
    if (action.target) {
      normalizeSafeRelativePath(action.target, `upgrade action ${action.type}.target`);
    }
    if (action.to) {
      normalizeSafeRelativePath(action.to, `upgrade action ${action.type}.to`);
    }
    if (action.from) {
      normalizeSafeSourcePath(action.from, blueprintDir, `upgrade action ${action.type}.from`);
    }
    if (action.type === "inject_agent_rules" && (!action.slot || typeof action.slot !== "string")) {
      throw new Error("upgrade inject_agent_rules action 必须包含 slot。");
    }
    if (action.type === "write_file" && typeof action.content !== "string") {
      throw new Error("upgrade write_file action 必须包含 content 字符串。");
    }
    if (action.type === "copy_seed") {
      const conflict = action.on_conflict || "error";
      if (!["error", "skip"].includes(conflict)) {
        throw new Error("upgrade copy_seed on_conflict 只支持 error 或 skip。");
      }
    }
  }
}

function buildUpgradePlan({ targetDir, blueprint }) {
  const effectiveKit = normalizeKitId(blueprint.base.kit);
  const kitDir = path.join(PRODUCT_ROOT, "core", "kits", effectiveKit);
  if (!fs.existsSync(kitDir)) {
    throw new Error(`找不到 Kit：${effectiveKit}`);
  }

  const packId = Object.hasOwn(blueprint.base, "pack")
    ? blueprint.base.pack
    : blueprint.base.workspace_type === "hub"
      ? null
      : "general";
  const pack = packId ? loadPack(packId, blueprint.base.language) : null;
  if (pack) validatePack(pack, blueprint.base.workspace_type);

  const now = new Date().toISOString();
  const variables = buildUpgradeVariables(blueprint, { targetDir, pack });
  const actions = [];
  const injectedTargets = new Set((blueprint.actions || [])
    .filter((action) => action.type === "inject_agent_rules")
    .map((action) => normalizeSafeRelativePath(action.target || "AGENTS.md", "upgrade inject target")));

  for (const action of blueprint.actions) {
    if (action.type === "ensure_dir") {
      actions.push(directoryAction(targetDir, normalizeSafeRelativePath(action.path, "upgrade ensure_dir.path")));
    } else if (action.type === "write_workspace_state") {
      actions.push(strictFileAction(targetDir, path.join(".starwork", "workspace.json"), renderUpgradeWorkspaceState(blueprint, pack, now)));
    } else if (action.type === "copy_kit_missing_files") {
      actions.push(...buildUpgradeKitActions(targetDir, kitDir, injectedTargets, blueprint));
    } else if (action.type === "inject_agent_rules") {
      actions.push(...buildUpgradeAgentRuleAction(targetDir, kitDir, blueprint, action, variables));
    } else if (action.type === "write_file") {
      const target = normalizeSafeRelativePath(action.path, "upgrade write_file.path");
      actions.push(strictFileAction(targetDir, target, renderText(action.content, variables)));
    } else if (action.type === "copy_seed") {
      const source = normalizeSafeSourcePath(action.from, blueprint.__dir, "upgrade copy_seed.from");
      const target = normalizeSafeRelativePath(action.to, "upgrade copy_seed.to");
      const targetPath = path.join(targetDir, target);
      if (fs.existsSync(targetPath)) {
        if ((action.on_conflict || "error") === "skip") continue;
        throw new Error(`upgrade copy_seed 目标已存在：${target}`);
      }
      actions.push(strictFileAction(targetDir, target, renderText(fs.readFileSync(source, "utf8"), variables)));
    }
  }

  actions.push(directoryAction(targetDir, normalizeSafeRelativePath(blueprint.paths.formal_source, "paths.formal_source")));
  actions.push(directoryAction(targetDir, normalizeSafeRelativePath(blueprint.paths.business_work_area, "paths.business_work_area")));
  if (pack) {
    for (const rolePath of Object.values(pack.paths || {})) {
      actions.push(directoryAction(targetDir, normalizeSafeRelativePath(rolePath, "pack.paths")));
    }
  }

  return {
    targetDir,
    blueprint,
    strategy: blueprint.strategy,
    workspaceType: blueprint.base.workspace_type,
    kit: effectiveKit,
    language: blueprint.base.language,
    pack,
    actions: dedupeActions(actions.filter(Boolean))
  };
}

function buildUpgradeKitActions(targetDir, kitDir, injectedTargets, blueprint = null) {
  const actions = [];
  for (const source of walkFiles(kitDir)) {
    const relativePath = normalizeRelativePath(path.relative(kitDir, source));
    if (isHubPreserveNamesUpgradeBlueprint(blueprint) && !isHubPreserveNamesKitFile(relativePath)) continue;
    if (injectedTargets.has(relativePath)) continue;
    const target = path.join(targetDir, relativePath);
    if (fs.existsSync(target)) continue;
    actions.push(strictFileAction(targetDir, relativePath, fs.readFileSync(source, "utf8")));
  }
  return actions;
}

function isHubPreserveNamesUpgradeBlueprint(blueprint) {
  return blueprint?.base?.workspace_type === "hub" && blueprint.strategy === "preserve-names";
}

function isHubPreserveNamesUpgradeState(state) {
  return state?.workspace_type === "hub"
    && state?.upgrade?.type === "upgrade_blueprint"
    && state?.upgrade?.strategy === "preserve-names";
}

function isHubPreserveNamesKitFile(relativePath) {
  return relativePath === "AGENTS.md"
    || relativePath === "README.md";
}

function buildUpgradeAgentRuleAction(targetDir, kitDir, blueprint, action, variables) {
  const target = normalizeSafeRelativePath(action.target || "AGENTS.md", "upgrade inject_agent_rules.target");
  const source = normalizeSafeSourcePath(action.from, blueprint.__dir, "upgrade inject_agent_rules.from");
  const slot = action.slot;
  const targetPath = path.join(targetDir, target);
  const kitDefaultPath = path.join(kitDir, target);
  const existing = fs.existsSync(targetPath)
    ? fs.readFileSync(targetPath, "utf8")
    : fs.existsSync(kitDefaultPath)
      ? fs.readFileSync(kitDefaultPath, "utf8")
      : "";

  const ruleContent = renderText(fs.readFileSync(source, "utf8"), variables).trim();
  if (!ruleContent) return [];
  const content = ensureRulesIndexReference(existing);
  const agentActions = content === existing
    ? []
    : [fs.existsSync(targetPath)
      ? overwriteFileAction(targetDir, target, content)
      : strictFileAction(targetDir, target, content)];
  return [
    ...agentActions,
    ...buildRuleSlotActions(targetDir, [{ slot, content: ruleContent, group: "StarWork 升级规则" }])
  ];
}

function renderUpgradeWorkspaceState(blueprint, pack, now) {
  const packRecord = pack ? [{
    id: pack.id,
    version: pack.version || "0.1.0",
    installed_at: now
  }] : [];
  const state = {
    schema: "starwork.workspace.v0.1",
    core: "0.1",
    workspace_type: blueprint.base.workspace_type,
    kit: blueprint.base.kit,
    packs: packRecord,
    language: blueprint.base.language,
    paths: {
      formal_source: normalizeSafeRelativePath(blueprint.paths.formal_source, "paths.formal_source"),
      business_work_area: normalizeSafeRelativePath(blueprint.paths.business_work_area, "paths.business_work_area")
    },
    upgrade: {
      type: "upgrade_blueprint",
      schema: blueprint.schema,
      source: path.basename(blueprint.__path),
      strategy: blueprint.strategy,
      generated_by: blueprint.generated_by || "starworkDoctor",
      core_role_mapping: Array.isArray(blueprint.core_role_mapping) ? blueprint.core_role_mapping : [],
      upgraded_at: now
    },
    created_by: "starwork upgrade"
  };
  return `${JSON.stringify(state, null, 2)}\n`;
}

function buildUpgradeVariables(blueprint, { targetDir, pack }) {
  return {
    blueprint,
    workspace: {
      name: path.basename(targetDir),
      type: blueprint.base.workspace_type
    },
    paths: {
      formal_source: normalizeSafeRelativePath(blueprint.paths.formal_source, "paths.formal_source"),
      business_work_area: normalizeSafeRelativePath(blueprint.paths.business_work_area, "paths.business_work_area")
    },
    upgrade: {
      strategy: blueprint.strategy
    },
    pack: pack || null
  };
}

function renderInstalledPackRules(pack, variables) {
  return renderRuleIndex(renderPackRuleSlots(pack, variables, "场景规则")).trim();
}

function validateRuleSlotId(slot) {
  if (!slot || typeof slot !== "string") {
    throw new Error("StarWork rule slot 不能为空。");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(slot)) {
    throw new Error(`StarWork rule slot 不合法：${slot}`);
  }
}

function hasRuleSlot(workspaceRoot, slot) {
  return fs.existsSync(path.join(workspaceRoot, ruleSlotRelativePath(slot)));
}

function ensureRulesIndexReference(content) {
  const current = String(content || "");
  if (current.includes(STARWORK_RULES_INDEX)) return current;
  const reference = `## StarWork 扩展规则\n\n执行任务前请同时读取 \`${STARWORK_RULES_INDEX}\`。这里汇总了当前工作台需要额外遵守的规则；不要把 \`${STARWORK_RULES_DIR}/\` 中的文件当作业务成果。\n`;
  return current.trim() ? `${current.trim()}\n\n${reference}` : `${reference}`;
}

function buildRuleSlotActions(targetDir, slots) {
  const normalizedSlots = normalizeRuleSlots(slots);
  if (!normalizedSlots.length) return [];
  const manifest = mergeRuleManifest(readRuleManifest(targetDir), normalizedSlots);
  return [
    directoryAction(targetDir, STARWORK_RULES_DIR),
    ...normalizedSlots.map((slot) => overwriteFileAction(targetDir, ruleSlotRelativePath(slot.slot), `${slot.content.trim()}\n`)),
    overwriteFileAction(targetDir, STARWORK_RULES_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`),
    overwriteFileAction(targetDir, STARWORK_RULES_INDEX, renderRuleIndex(manifest.slots))
  ];
}

function normalizeRuleSlots(slots) {
  return (slots || [])
    .map((slot) => ({
      slot: slot.slot,
      group: slot.group || "StarWork 规则",
      title: slot.title || inferRuleTitle(slot.content, slot.slot),
      content: String(slot.content || "").trim(),
      file: ruleSlotRelativePath(slot.slot)
    }))
    .filter((slot) => {
      validateRuleSlotId(slot.slot);
      return Boolean(slot.content);
    });
}

function readRuleManifest(targetDir) {
  const manifestPath = path.join(targetDir, STARWORK_RULES_MANIFEST);
  if (!fs.existsSync(manifestPath)) {
    return { schema: "starwork.agent_rules.v0.1", slots: [] };
  }
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    return {
      schema: "starwork.agent_rules.v0.1",
      slots: Array.isArray(manifest.slots) ? manifest.slots : []
    };
  } catch {
    return { schema: "starwork.agent_rules.v0.1", slots: [] };
  }
}

function mergeRuleManifest(existing, slots) {
  const bySlot = new Map();
  for (const slot of existing.slots || []) {
    if (slot?.slot) bySlot.set(slot.slot, slot);
  }
  for (const slot of slots) {
    bySlot.set(slot.slot, {
      slot: slot.slot,
      title: slot.title,
      group: slot.group,
      file: slot.file
    });
  }
  return {
    schema: "starwork.agent_rules.v0.1",
    slots: [...bySlot.values()].sort((a, b) => a.slot.localeCompare(b.slot))
  };
}

function ruleSlotRelativePath(slot) {
  validateRuleSlotId(slot);
  return path.join(STARWORK_RULES_DIR, `${slot}.md`);
}

function inferRuleTitle(content, fallback) {
  const match = String(content || "").match(/^#{1,4}\s+(.+?)\s*$/m);
  return match ? match[1].trim() : fallback;
}

function renderRuleIndex(slots) {
  const grouped = new Map();
  for (const slot of slots || []) {
    const group = slot.group || "StarWork 规则";
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group).push(slot);
  }
  const lines = [
    "# StarWork 扩展规则",
    "",
    "这个目录由 StarWork CLI 维护，用来存放当前工作台需要额外遵守的稳定规则。",
    "",
    "这些规则是工作台运行约定的一部分；执行任务前请按索引读取。"
  ];
  for (const [group, groupSlots] of grouped.entries()) {
    lines.push("", `## ${group}`, "");
    for (const slot of groupSlots) {
      lines.push(`- [${slot.title || slot.slot}](${path.basename(slot.file || ruleSlotRelativePath(slot.slot))})`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function mergeInstalledRecords(existing, ids) {
  const current = Array.isArray(existing) ? existing.filter((item) => item?.id) : [];
  const seen = new Set(current.map((item) => item.id));
  const merged = [...current];
  for (const id of ids) {
    if (seen.has(id)) continue;
    merged.push({
      id,
      installed_at: new Date().toISOString()
    });
    seen.add(id);
  }
  return merged;
}

function checkWorkspaceState(result, state) {
  if (state.schema === "starwork.workspace.v0.1") {
    addCheck(result, "workspace.state.schema", "pass", "workspace schema is starwork.workspace.v0.1", ".starwork/workspace.json");
  } else {
    addCheck(result, "workspace.state.schema", "fail", "workspace schema 不是 starwork.workspace.v0.1。", ".starwork/workspace.json");
  }

  if (state.core === "0.1") {
    addCheck(result, "workspace.state.core", "pass", "Core version is 0.1", ".starwork/workspace.json");
  } else {
    addCheck(result, "workspace.state.core", "fail", "workspace core 必须兼容 0.1。", ".starwork/workspace.json");
  }

  if (["project", "hub", "single-light", "satellite-starter"].includes(state.workspace_type)) {
    addCheck(result, "workspace.state.type", "pass", `workspace_type is ${state.workspace_type}`, ".starwork/workspace.json");
  } else {
    addCheck(result, "workspace.state.type", "fail", "workspace_type 必须是 project、hub 或 single-light / satellite-starter 兼容别名。", ".starwork/workspace.json");
  }

  if (state.kit) {
    addCheck(result, "workspace.state.kit", "pass", `kit is ${state.kit}`, ".starwork/workspace.json");
  } else {
    addCheck(result, "workspace.state.kit", "fail", "workspace state 缺少 kit。", ".starwork/workspace.json");
  }

  if (state.language) {
    addCheck(result, "workspace.state.language", "pass", `language is ${state.language}`, ".starwork/workspace.json");
  } else {
    addCheck(result, "workspace.state.language", "fail", "workspace state 缺少 language。", ".starwork/workspace.json");
  }

  if (Array.isArray(state.packs)) {
    addCheck(result, "workspace.state.packs", "pass", `packs count is ${state.packs.length}`, ".starwork/workspace.json");
  } else {
    addCheck(result, "workspace.state.packs", "fail", "workspace state 的 packs 必须是数组。", ".starwork/workspace.json");
  }

  if (state.paths?.formal_source) {
    addCheck(result, "workspace.state.formal_source", "pass", `formal source is ${state.paths.formal_source}`, ".starwork/workspace.json");
  } else {
    addCheck(result, "workspace.state.formal_source", "fail", "workspace state 缺少 paths.formal_source。", ".starwork/workspace.json");
  }

  if (state.paths?.business_work_area) {
    addCheck(result, "workspace.state.business_work_area", "pass", `business work area is ${state.paths.business_work_area}`, ".starwork/workspace.json");
  } else {
    addCheck(result, "workspace.state.business_work_area", "fail", "workspace state 缺少 paths.business_work_area。", ".starwork/workspace.json");
  }
}

function checkKit(result, workspaceRoot, state) {
  if (!state.kit) return;

  const effectiveKit = normalizeKitId(state.kit);
  const kitDir = path.join(PRODUCT_ROOT, "core", "kits", effectiveKit);
  if (!fs.existsSync(kitDir)) {
    addCheck(result, "kit.source.exists", "fail", `找不到 Kit 源目录：${effectiveKit}`);
    return;
  }
  addCheck(result, "kit.source.exists", "pass", `Kit source exists: ${effectiveKit}`);

  const allowedKits = {
    project: ["project"],
    "single-light": ["project"],
    hub: ["hub"],
    "satellite-starter": ["project"]
  };
  const allowed = allowedKits[state.workspace_type];
  if (allowed && allowed.includes(effectiveKit)) {
    addCheck(result, "kit.workspace_type.match", "pass", `${state.kit} maps to ${effectiveKit} for ${state.workspace_type}`);
  } else {
    addCheck(result, "kit.workspace_type.match", "fail", `Kit ${state.kit} 与工作区类型 ${state.workspace_type || "(missing)"} 不匹配。`);
  }

  const files = isHubPreserveNamesUpgradeState(state)
    ? walkFiles(kitDir).filter(isHubPreserveNamesKitFile)
    : walkFiles(kitDir);
  const removedByInitBlueprint = state.customization?.type === "init_blueprint"
    ? state.customization.removals || []
    : [];
  const missing = [];
  for (const source of files) {
    const sourceRelativePath = normalizeRelativePath(path.relative(kitDir, source));
    const relativePath = mapKitRelativePathForWorkspace(sourceRelativePath, effectiveKit, state.language || "zh");
    if (matchesAnyRemovedPath(relativePath, removedByInitBlueprint)) continue;
    if (!fs.existsSync(path.join(workspaceRoot, relativePath))) {
      missing.push(relativePath);
    }
  }
  if (missing.length === 0) {
    addCheck(result, "kit.files.complete", "pass", `Kit files are complete: ${state.kit}`);
  } else {
    addCheck(result, "kit.files.complete", "fail", `Kit 缺少 ${missing.length} 个文件。`, missing.slice(0, 5).join(", "));
  }
}

function checkCoreRoles(result, workspaceRoot, state) {
  checkPathExists(result, workspaceRoot, "AGENTS.md", "core.entry_rules.exists", "Agent entry rules exist", "缺少 Agent 入口规则 AGENTS.md。");

  if (state.workspace_type === "hub") {
    checkHubCoreRoles(result, workspaceRoot, state);
    return;
  }

  const rolePaths = getCoreRolePaths(state);
  checkPathExists(result, workspaceRoot, rolePaths.projectStatus, "core.project_status.exists", "Project status exists", "缺少项目状态文件。");
  checkPathExists(result, workspaceRoot, rolePaths.currentWork, "core.current_work.exists", "Current work exists", "缺少当前工作入口文件。");

  if (state.paths?.formal_source) {
    checkPathExists(result, workspaceRoot, state.paths.formal_source, "core.formal_source.exists", "Formal source exists", "缺少 workspace state 声明的正式事实源。");
  }

  if (state.paths?.business_work_area) {
    checkPathExists(result, workspaceRoot, state.paths.business_work_area, "core.business_work_area.exists", "Business work area exists", "缺少 workspace state 声明的业务工作区。");
  }
}

function checkHubCoreRoles(result, workspaceRoot, state) {
  if (isHubPreserveNamesUpgradeState(state)) {
    if (state.paths?.formal_source) {
      checkPathExists(result, workspaceRoot, state.paths.formal_source, "hub.formal_source.exists", "Project Center formal source exists", "缺少项目中心正式事实源。");
    }
    if (state.paths?.business_work_area) {
      checkPathExists(result, workspaceRoot, state.paths.business_work_area, "hub.business_work_area.exists", "Project Center business work area exists", "缺少项目中心当前协调工作区。");
    }
    return;
  }
  const hubPaths = getHubPaths(state);
  checkPathExists(result, workspaceRoot, hubPaths.projectRegistry, "hub.project_registry.exists", "Project Center project registry exists", "缺少项目中心项目注册表。");
  checkPathExists(result, workspaceRoot, hubPaths.coordination, "hub.coordination.exists", "Project Center coordination layer exists", "缺少项目中心跨项目协调层。");
  checkPathExists(result, workspaceRoot, hubPaths.localHandoff, "hub.local_handoff.exists", "Project Center local handoff queue exists", "缺少项目中心本地收发队列。");
  checkPathExists(result, workspaceRoot, hubPaths.incoming, "hub.incoming.exists", "Project Center incoming review queue exists", "缺少项目中心回写待审区。");
  checkPathExists(result, workspaceRoot, hubPaths.identity, "hub.identity.exists", "Project Center identity source exists", `缺少项目中心身份目录：${hubPaths.identity}`);
  checkPathExists(result, workspaceRoot, hubPaths.lessons, "hub.lessons.exists", "Project Center lessons source exists", `缺少项目中心教训目录：${hubPaths.lessons}`);
  checkPathExists(result, workspaceRoot, hubPaths.knowledge, "hub.knowledge.exists", "Project Center knowledge source exists", "缺少项目中心 knowledge/。");
  checkPathExists(result, workspaceRoot, path.join(hubPaths.formalSkills, "registry.json"), "hub.skills_registry.exists", "Project Center skill registry exists", "缺少项目中心 skills/registry.json。");
  checkPathExists(result, workspaceRoot, hubPaths.draftsAndExperiments, "hub.workspace.exists", "Project Center workspace exists", "缺少项目中心 workspace/。");
  checkHubDuplicateSemanticDirs(result, workspaceRoot);
  checkHubRuleDocumentPaths(result, workspaceRoot);
}

function checkKnowledgeCapability(result, workspaceRoot, state) {
  if (state.workspace_type === "hub") return;
  const status = collectKnowledgeStatus(workspaceRoot, state);
  result.knowledge = status;

  if (!status.enabled && !status.exists) {
    addCheck(result, "knowledge.optional.not_enabled", "info", "项目未开启知识库；这不是结构问题。");
  } else if (status.enabled) {
    if (status.exists && status.warnings.length === 0) {
      addCheck(result, "knowledge.structure.complete", "pass", `项目知识库结构完整：${status.root}`, status.root);
    } else {
      addCheck(result, "knowledge.structure.complete", "fail", `项目知识库已开启，但结构不完整：${status.root}`, status.root);
    }
  } else if (status.exists) {
    addCheck(result, "knowledge.structure.undeclared", "warn", `检测到项目知识库目录，但 workspace state 尚未声明开启：${status.root}`, status.root);
  }

  if (status.legacy_candidates.length) {
    addCheck(result, "knowledge.legacy_candidates.detected", "info", `检测到旧知识相关目录：${status.legacy_candidates.join(", ")}。不会自动移动或删除。`, status.legacy_candidates.join(", "));
  }
}

function checkHubDuplicateSemanticDirs(result, workspaceRoot) {
  const pairs = [
    ["identity", "身份", "身份"],
    ["lessons", "教训", "教训"],
    ["knowledge", "知识", "知识"],
    ["projects", "项目", "项目"],
    ["skills", "技能", "技能"],
    ["workspace", "工作区", "工作区"]
  ];
  for (const [enPath, zhPath, label] of pairs) {
    const hasEn = fs.existsSync(path.join(workspaceRoot, enPath));
    const hasZh = fs.existsSync(path.join(workspaceRoot, zhPath));
    if (hasEn && hasZh) {
      addCheck(result, "hub.semantic_duplicate_dirs", "warn", `项目中心同时存在 ${enPath}/ 和 ${zhPath}/，它们都像“${label}”目录。请保留与工作台语言一致的一个。`, `${enPath}, ${zhPath}`);
    }
  }
}

function checkHubRuleDocumentPaths(result, workspaceRoot) {
  const legacyPathPatterns = [
    ".starwork/projects",
    ".starwork/coordination",
    ".starwork/incoming"
  ];
  for (const relativePath of ["AGENTS.md", "README.md"]) {
    const filePath = path.join(workspaceRoot, relativePath);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, "utf8");
    const matched = legacyPathPatterns.filter((pattern) => content.includes(pattern));
    if (matched.length) {
      addCheck(
        result,
        `hub.rules.${relativePath.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.paths`,
        "warn",
        `${relativePath} 里还写着旧项目中心路径：${matched.join(", ")}。新版项目中心使用 projects/、.incoming/ 和 .starwork/handoff/。`,
        relativePath
      );
    } else {
      addCheck(result, `hub.rules.${relativePath.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.paths`, "pass", `${relativePath} uses current Project Center paths`, relativePath);
    }
  }
}

function checkAgentRuleReferences(result, workspaceRoot) {
  const rulesDir = path.join(workspaceRoot, STARWORK_RULES_DIR);
  const files = [
    "AGENTS.md",
    "CLAUDE.md",
    STARWORK_RULES_INDEX,
    ...(fs.existsSync(rulesDir) ? walkFiles(rulesDir) : [])
      .filter((file) => file.endsWith(".md"))
      .map((file) => normalizeRelativePath(path.relative(workspaceRoot, file)))
  ];
  const missing = [];
  const seen = new Set();
  for (const relativePath of files) {
    const filePath = path.join(workspaceRoot, relativePath);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) continue;
    const content = fs.readFileSync(filePath, "utf8");
    const references = extractWorkspacePathReferences(content);
    for (const reference of references) {
      if (reference.planned) continue;
      const key = `${relativePath}:${reference.path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!fs.existsSync(path.join(workspaceRoot, reference.path))) {
        missing.push({ file: relativePath, path: reference.path });
      }
    }
  }
  if (missing.length === 0) {
    addCheck(result, "agents.references.existing_paths", "pass", "Agent rules only reference existing workspace paths");
    return;
  }
  const sample = missing.slice(0, 5).map((item) => `${item.file} -> ${item.path}`).join("；");
  addCheck(
    result,
    "agents.references.existing_paths",
    "warn",
    `Agent 规则提到了当前工作台里不存在的路径：${sample}${missing.length > 5 ? `；另有 ${missing.length - 5} 项` : ""}。`,
    missing[0].file
  );
}

function checkAgentDocsDraftState(result, workspaceRoot) {
  const planPath = path.join(AGENT_DOCS_DRAFT_DIR, "agent-docs-plan.json");
  if (fs.existsSync(path.join(workspaceRoot, planPath))) {
    addCheck(result, "agent_docs.plan.pending", "warn", "存在待整合的 AI 入口文档草稿；请用 starworkInit 读取 agent-docs-plan.json 后合并最终入口。", planPath);
  }
  for (const relativePath of LEGACY_AGENT_DOC_SIDECARS) {
    if (fs.existsSync(path.join(workspaceRoot, relativePath))) {
      addCheck(result, `agent_docs.legacy_sidecar.${slugifyCheckId(relativePath)}`, "warn", `检测到旧流程生成的入口旁路文件：${relativePath}。请由 starworkInit 整合后再保留或删除。`, relativePath);
    }
  }
}

function checkHostAdapters(result, workspaceRoot, state, options = {}) {
  if (!options.host) return;
  const hostOption = options.host === true ? "all" : options.host;
  const hosts = resolveAdapterHosts(hostOption);
  const adaptersState = readAdaptersState(workspaceRoot);
  const adaptersFileExists = fs.existsSync(path.join(workspaceRoot, ".starwork", "adapters.json"));
  const workspaceAdapters = state.adapters || {};
  result.adapters = {
    schema: "starwork.doctor.host_adapters.v0.1",
    state_path: ".starwork/adapters.json",
    state_exists: adaptersFileExists,
    checked_hosts: []
  };

  for (const host of hosts) {
    const profile = loadAdapterProfile(host);
    const record = adaptersState.adapters?.[profile.host] || null;
    const workspaceSummary = Array.isArray(workspaceAdapters)
      ? workspaceAdapters.find((item) => ADAPTER_ALIASES[item?.id] === profile.host)
      : workspaceAdapters[profile.host] || null;
    const hostReport = {
      host: profile.host,
      label: profile.label,
      enabled: Boolean(record?.enabled),
      rules_entry: record?.rules_entry || profile.rules.entry_file,
      rules_entry_status: record?.rules_entry_status || (record?.enabled ? "active" : "missing"),
      draft_entry: record?.draft_entry || null,
      skill_mount_dirs: profile.skills.project_mount_dirs
    };
    result.adapters.checked_hosts.push(hostReport);

    if (record?.rules_entry_status === "pending_merge") {
      addCheck(result, `adapter.${profile.host}.rules.pending_merge`, "warn", `${profile.label} 入口规则仍是 pending_merge；请先用 starworkInit 整合 AI 入口文档，再继续 MultiAgent 团队创建。`, record.draft_entry || record.rules_entry);
      for (const dir of profile.skills.project_mount_dirs) {
        const exists = fs.existsSync(path.join(workspaceRoot, dir));
        addCheck(result, `adapter.${profile.host}.skills.mount_dir.${slugifyCheckId(dir)}`, exists ? "pass" : "warn", exists ? `${profile.label} Skill mount dir exists: ${dir}` : `${profile.label} 缺少项目 Skill 挂载目录：${dir}`, dir);
      }
      continue;
    }

    if (!record?.enabled) {
      if (workspaceSummary && !adaptersFileExists) {
        addCheck(result, `adapter.${profile.host}.state.legacy`, "info", `${profile.label} 只有旧 workspace.json adapter 摘要。可运行 starwork adapt ${profile.host} --yes 刷新。`, ".starwork/workspace.json");
      } else {
        addCheck(result, `adapter.${profile.host}.enabled`, "info", `${profile.label} 尚未启用 Host Adapter；这不是 Core 结构问题。`);
      }
      continue;
    }

    addCheck(result, `adapter.${profile.host}.enabled`, "pass", `${profile.label} Host Adapter enabled`, ".starwork/adapters.json");
    const entry = record?.rules_entry || profile.rules.entry_file;
    if (entry) {
      const entryPath = path.join(workspaceRoot, entry);
      if (!fs.existsSync(entryPath)) {
        addCheck(result, `adapter.${profile.host}.rules.entry.exists`, "warn", `${profile.label} 规则入口缺失：${entry}`, entry);
      } else {
        addCheck(result, `adapter.${profile.host}.rules.entry.exists`, "pass", `${profile.label} rules entry exists`, entry);
        const content = fs.readFileSync(entryPath, "utf8");
        if (content.includes("AGENTS.md")) {
          addCheck(result, `adapter.${profile.host}.rules.agents_reference`, "pass", `${profile.label} rules entry references AGENTS.md`, entry);
        } else {
          addCheck(result, `adapter.${profile.host}.rules.agents_reference`, "warn", `${profile.label} 规则入口没有明确引导读取 AGENTS.md。`, entry);
        }
        if (content.includes(".starwork/skills.json")) {
          addCheck(result, `adapter.${profile.host}.rules.skills_manifest`, "pass", `${profile.label} rules entry references .starwork/skills.json`, entry);
        } else {
          addCheck(result, `adapter.${profile.host}.rules.skills_manifest`, "warn", `${profile.label} 规则入口没有明确引导读取 .starwork/skills.json。`, entry);
        }
      }
    }

    for (const dir of profile.skills.project_mount_dirs) {
      const exists = fs.existsSync(path.join(workspaceRoot, dir));
      addCheck(result, `adapter.${profile.host}.skills.mount_dir.${slugifyCheckId(dir)}`, exists ? "pass" : "warn", exists ? `${profile.label} Skill mount dir exists: ${dir}` : `${profile.label} 缺少项目 Skill 挂载目录：${dir}`, dir);
    }

    checkHostSkillConflicts(result, workspaceRoot, profile);
    checkHostSkillFrontmatter(result, workspaceRoot, profile);
    checkHostDisabledSkills(result, workspaceRoot, profile);
    checkHostCapabilitySafety(result, profile, record);
  }
}

function checkHostSkillConflicts(result, workspaceRoot, profile) {
  const dirs = profile.skills.conflict_priority || [];
  const locations = new Map();
  for (const dir of dirs) {
    const absoluteDir = path.join(workspaceRoot, dir);
    if (!fs.existsSync(absoluteDir) || !fs.statSync(absoluteDir).isDirectory()) continue;
    for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const list = locations.get(entry.name) || [];
      list.push(path.join(dir, entry.name));
      locations.set(entry.name, list);
    }
  }
  for (const [skillId, paths] of locations.entries()) {
    if (paths.length > 1) {
      addCheck(result, `adapter.${profile.host}.skills.conflict.${slugifyCheckId(skillId)}`, "warn", `${profile.label} 存在同名 Skill：${skillId}。优先级为 ${profile.skills.conflict_priority.join(" > ")}。`, paths[0]);
    }
  }
}

function checkHostSkillFrontmatter(result, workspaceRoot, profile) {
  const rule = profile.skills.frontmatter;
  if (!rule) return;
  for (const dir of profile.skills.host_native_dirs || []) {
    const absoluteDir = path.join(workspaceRoot, dir);
    if (!fs.existsSync(absoluteDir) || !fs.statSync(absoluteDir).isDirectory()) continue;
    for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillPath = path.join(dir, entry.name, "SKILL.md");
      const absoluteSkillPath = path.join(workspaceRoot, skillPath);
      if (!fs.existsSync(absoluteSkillPath)) {
        addCheck(result, `adapter.${profile.host}.skills.frontmatter.${slugifyCheckId(entry.name)}.exists`, "warn", `${profile.label} Skill 缺少 SKILL.md：${skillPath}`, skillPath);
        continue;
      }
      const parsed = parseSkillFrontmatter(fs.readFileSync(absoluteSkillPath, "utf8"));
      if (!parsed.name || !parsed.description) {
        addCheck(result, `adapter.${profile.host}.skills.frontmatter.${slugifyCheckId(entry.name)}.required`, "warn", `${profile.label} Skill frontmatter 缺少 name 或 description：${skillPath}`, skillPath);
      }
      if (parsed.name && rule.name_matches_parent && parsed.name !== entry.name) {
        addCheck(result, `adapter.${profile.host}.skills.frontmatter.${slugifyCheckId(entry.name)}.name_match`, "warn", `${profile.label} Skill name 必须与父文件夹名一致：${skillPath}`, skillPath);
      }
      if (parsed.name && rule.name_pattern && !(new RegExp(rule.name_pattern).test(parsed.name))) {
        addCheck(result, `adapter.${profile.host}.skills.frontmatter.${slugifyCheckId(entry.name)}.name_pattern`, "warn", `${profile.label} Skill name 只能使用小写字母、数字和连字符：${skillPath}`, skillPath);
      }
    }
  }
}

function parseSkillFrontmatter(content) {
  const match = String(content || "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const result = {};
  if (!match) return result;
  for (const line of match[1].split(/\r?\n/)) {
    const parts = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!parts) continue;
    result[parts[1]] = parts[2].replace(/^["']|["']$/g, "").trim();
  }
  return result;
}

function checkHostDisabledSkills(result, workspaceRoot, profile) {
  if (profile.host !== "trae") return;
  const configPath = path.join(workspaceRoot, ".trae", "skill-config.json");
  if (!fs.existsSync(configPath)) return;
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    addCheck(result, "adapter.trae.skills.disabled_config.parse", "warn", `无法解析 Trae Skill 配置：${error.message}`, ".trae/skill-config.json");
    return;
  }
  const disabled = new Set(extractDisabledSkillIds(config));
  if (!disabled.size) return;
  const manifest = readProjectSkillsManifest(workspaceRoot);
  for (const skill of manifest.skills || []) {
    if (disabled.has(skill.id)) {
      addCheck(result, `adapter.trae.skills.disabled.${slugifyCheckId(skill.id)}`, "warn", `Trae 可能禁用了 StarWork 声明启用的 Skill：${skill.id}`, ".trae/skill-config.json");
    }
  }
}

function extractDisabledSkillIds(value, keyHint = "") {
  const result = [];
  if (Array.isArray(value)) {
    for (const item of value) result.push(...extractDisabledSkillIds(item, keyHint));
    return result;
  }
  if (!value || typeof value !== "object") return result;
  for (const [key, nested] of Object.entries(value)) {
    if ((key === "disabled" || key === "disabledSkills" || key === "disabled_skills") && Array.isArray(nested)) {
      result.push(...nested.filter((item) => typeof item === "string"));
      continue;
    }
    if (nested && typeof nested === "object") {
      const id = nested.id || nested.name || key;
      if ((nested.enabled === false || nested.disabled === true) && typeof id === "string") result.push(id);
      result.push(...extractDisabledSkillIds(nested, key));
    } else if ((nested === false || nested === "disabled") && keyHint) {
      result.push(keyHint);
    }
  }
  return result;
}

function checkHostCapabilitySafety(result, profile, record) {
  const sendMessage = record?.capabilities?.["sessions.send_message"];
  if (profile.host === "trae" && sendMessage === "supported") {
    addCheck(result, "adapter.trae.capabilities.send_message", "fail", "Trae 被记录为支持自动跨会话发送，这会误导用户；v0.1 必须降级为 manual。", ".starwork/adapters.json");
  }
}

function slugifyCheckId(value) {
  return String(value || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "unknown";
}

function extractWorkspacePathReferences(content) {
  const references = [];
  const lines = String(content || "").split(/\r?\n/);
  for (const line of lines) {
    const planned = /计划目录|planned placeholder|planned directory/i.test(line);
    const matches = line.matchAll(/`([^`]+)`/g);
    for (const match of matches) {
      const raw = match[1].trim();
      if (!looksLikeWorkspacePath(raw)) continue;
      let normalized;
      try {
        normalized = normalizeSafeRelativePath(raw, "agent rule path reference");
      } catch {
        continue;
      }
      references.push({ path: normalized, planned });
    }
  }
  return references;
}

function looksLikeWorkspacePath(raw) {
  if (!raw || /\s/.test(raw)) return false;
  if (/^[a-z]+:\/\//i.test(raw)) return false;
  if (raw.startsWith("@")) return false;
  if (raw.includes("{{") || raw.includes("}}")) return false;
  if (raw === "(none)" || raw === "none") return false;
  if (raw.startsWith("-")) return false;
  return raw.includes("/")
    || raw.startsWith(".")
    || /\.(md|json|yaml|yml|txt)$/i.test(raw);
}

function getCoreRolePaths(state) {
  const kit = state.kit || "";
  const language = state.language || "zh";
  if (kit === "project" || kit.startsWith("satellite-") || getProjectCenterBinding(state)) {
    const satellitePaths = getSatellitePaths(language);
    return {
      projectStatus: satellitePaths.projectStatus,
      currentWork: satellitePaths.currentWork
    };
  }
  if (language === "en") {
    return {
      projectStatus: "_system/context/project-status.md",
      currentWork: "_system/tasks/current-work.md"
    };
  }
  return {
    projectStatus: "_系统/上下文/项目状态.md",
    currentWork: "_系统/任务/当前工作.md"
  };
}

function getProjectCenterBinding(state = {}) {
  return state.project_center || state.hub || null;
}

function getHubStandardPaths(language = "en") {
  return HUB_LANGUAGE_PATHS[language] || HUB_STANDARD_PATHS;
}

function getHubStatePathsForLanguage(language = "en") {
  const paths = getHubStandardPaths(language);
  return {
    identity: paths.identity,
    lessons: paths.lessons,
    project_registry: paths.projectRegistry,
    coordination: paths.coordination,
    local_handoff: paths.localHandoff,
    incoming: paths.incoming,
    formal_skills: paths.formalSkills,
    drafts_and_experiments: paths.draftsAndExperiments,
    knowledge: paths.knowledge
  };
}

function resolveWorkspaceRolePath(state, role, fallbackPath) {
  const mappings = state?.upgrade?.core_role_mapping;
  if (Array.isArray(mappings)) {
    const mapping = mappings.find((item) => item?.role === role && item.path);
    if (mapping) {
      return {
        role,
        path: normalizeSafeRelativePath(mapping.path, `upgrade core_role_mapping.${role}`),
        source: "upgrade.core_role_mapping"
      };
    }
  }
  return {
    role,
    path: normalizeRelativePath(fallbackPath),
    source: "default"
  };
}

function checkPackInstallations(result, workspaceRoot, state) {
  if (!Array.isArray(state.packs)) return;
  for (const installedPack of state.packs) {
    if (!installedPack?.id) {
      addCheck(result, "pack.id.exists", "fail", "已安装 Pack 缺少 id。", ".starwork/workspace.json");
      continue;
    }

    let pack;
    try {
      pack = loadPack(installedPack.id, state.language || "zh");
    } catch (error) {
      addCheck(result, "pack.source.exists", "fail", `无法读取 Pack ${installedPack.id}：${error.message}`);
      continue;
    }

    addCheck(result, "pack.source.exists", "pass", `Pack source exists: ${installedPack.id}`);

    if (pack.compatible_core === state.core) {
      addCheck(result, "pack.core.compatible", "pass", `${installedPack.id} is compatible with Core ${state.core}`);
    } else {
      addCheck(result, "pack.core.compatible", "fail", `Pack ${installedPack.id} 不兼容 Core ${state.core || "(missing)"}。`);
    }

    if (packSupportsWorkspaceType(pack, state.workspace_type)) {
      addCheck(result, "pack.workspace_type.supported", "pass", `${installedPack.id} supports ${state.workspace_type}`);
    } else {
      addCheck(result, "pack.workspace_type.supported", "fail", `Pack ${installedPack.id} 不支持工作区类型 ${state.workspace_type || "(missing)"}。`);
    }

    const installedPaths = installedPack.paths && typeof installedPack.paths === "object"
      ? installedPack.paths
      : pack.paths || {};
    for (const rolePath of Object.values(installedPaths)) {
      checkPathExists(result, workspaceRoot, rolePath, "pack.paths.exist", `Pack path exists: ${rolePath}`, `Pack ${installedPack.id} 缺少目录：${rolePath}`);
    }

    for (const seed of pack.seed || []) {
      checkPathExists(result, workspaceRoot, seed.to, "pack.seed.installed", `Pack seed exists: ${seed.to}`, `Pack ${installedPack.id} 缺少 seed 文件：${seed.to}`);
    }

    for (const template of pack.templates || []) {
      const relativePath = path.join(".starwork", "packs", pack.id, "templates", path.basename(template.from));
      checkPathExists(result, workspaceRoot, relativePath, "pack.templates.installed", `Pack template exists: ${relativePath}`, `Pack ${installedPack.id} 缺少模板：${relativePath}`);
    }
  }
}

function checkBlueprintCustomization(result, workspaceRoot, state) {
  const customization = state.customization;
  if (!customization) return;
  if (customization.type !== "spawn_blueprint" && customization.type !== "init_blueprint") return;

  const expectedSchema = customization.type === "init_blueprint"
    ? "starwork.init_blueprint.v0.1"
    : "starwork.spawn_blueprint.v0.1";
  if (customization.schema === expectedSchema) {
    addCheck(result, "blueprint.schema", "pass", `Blueprint schema is ${expectedSchema}`, ".starwork/workspace.json");
  } else {
    addCheck(result, "blueprint.schema", "fail", "Blueprint customization schema 不正确。", ".starwork/workspace.json");
  }

  for (const folder of customization.folders || []) {
    checkPathExists(result, workspaceRoot, folder, "blueprint.folder.exists", `Blueprint folder exists: ${folder}`, `Blueprint 缺少定制目录：${folder}`);
  }

  for (const seed of customization.seed || []) {
    if (!seed?.to) continue;
    checkPathExists(result, workspaceRoot, seed.to, "blueprint.seed.exists", `Blueprint seed exists: ${seed.to}`, `Blueprint 缺少 seed 文件：${seed.to}`);
  }

  for (const rule of customization.agent_rules || []) {
    if (!rule?.slot) continue;
    if (hasRuleSlot(workspaceRoot, rule.slot)) {
      addCheck(result, "blueprint.rule.injected", "pass", `Blueprint rule exists: ${rule.slot}`, ruleSlotRelativePath(rule.slot));
    } else {
      addCheck(result, "blueprint.rule.injected", "fail", `Blueprint 规则文件不存在：${rule.slot}`, ruleSlotRelativePath(rule.slot));
    }
  }
}

function checkUpgradeRoleMappings(result, workspaceRoot, state) {
  const mappings = state.upgrade?.core_role_mapping;
  if (!Array.isArray(mappings) || mappings.length === 0) return;
  for (const mapping of mappings) {
    if (!mapping?.path) continue;
    const rolePath = normalizeSafeRelativePath(mapping.path, "upgrade core_role_mapping.path");
    checkPathExists(
      result,
      workspaceRoot,
      rolePath,
      "upgrade.role_mapping.exists",
      `Upgrade role mapping exists: ${mapping.role || "role"} -> ${rolePath}`,
      `升级映射缺少目录或文件：${rolePath}`
    );
  }
}

function checkSkillInstallations(result, workspaceRoot, state) {
  const manifestPath = path.join(workspaceRoot, ".starwork", "skills.json");
  let manifestSkills = [];
  const skills = {
    project_manifest: {
      exists: fs.existsSync(manifestPath),
      path: ".starwork/skills.json",
      count: 0
    },
    registry: null,
    required: [],
    mounts: []
  };
  result.skills = skills;

  if (!skills.project_manifest.exists) {
    addCheck(result, "skills.project_manifest.exists", "warn", "缺少项目 Skill 清单 .starwork/skills.json。", ".starwork/skills.json");
  } else {
    addCheck(result, "skills.project_manifest.exists", "pass", "Project skill manifest exists", ".starwork/skills.json");
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch (error) {
      addCheck(result, "skills.project_manifest.parse", "fail", `无法解析项目 Skill 清单：${error.message}`, ".starwork/skills.json");
      manifest = null;
    }
    if (manifest) {
      if (manifest.schema === "starwork.project_skills.v0.1") {
        addCheck(result, "skills.project_manifest.schema", "pass", "Project skill manifest schema is valid", ".starwork/skills.json");
      } else {
        addCheck(result, "skills.project_manifest.schema", "fail", "项目 Skill 清单 schema 不正确。", ".starwork/skills.json");
      }
      manifestSkills = Array.isArray(manifest.skills) ? manifest.skills : [];
      skills.project_manifest.count = manifestSkills.length;
      for (const skill of manifestSkills) {
        if (!skill?.id) {
          addCheck(result, "skills.id.exists", "fail", "项目 Skill 清单中存在缺少 id 的条目。", ".starwork/skills.json");
          continue;
        }
        for (const mount of skill.mounts || []) {
          if (!mount?.path) continue;
          const normalized = normalizeRelativePath(mount.path);
          const exists = fs.existsSync(path.join(workspaceRoot, normalized));
          skills.mounts.push({
            id: skill.id,
            path: normalized,
            mode: mount.mode || null,
            status: exists ? "ok" : "missing"
          });
          if (exists) {
            addCheck(result, "skills.mount.exists", "pass", `Skill mount exists: ${skill.id}`, normalized);
          } else {
            addCheck(result, "skills.mount.exists", "fail", `Skill ${skill.id} 缺少挂载路径：${normalized}`, normalized);
          }
        }
      }
    }
  }

  if (state.workspace_type === "hub") {
    const hubPaths = getHubPaths(state);
    const skillsRoot = resolveWorkspaceRolePath(state, "skills", hubPaths.formalSkills);
    const registryRelativePath = path.join(skillsRoot.path, "registry.json");
    const registryPath = path.join(workspaceRoot, registryRelativePath);
    skills.registry = {
      exists: fs.existsSync(registryPath),
      path: registryRelativePath,
      path_source: skillsRoot.source,
      role: skillsRoot.role,
      count: 0
    };
    if (!skills.registry.exists) {
      addCheck(result, "skills.registry.exists", "warn", "项目中心缺少托管 Skill 注册表。", registryRelativePath);
    } else {
      addCheck(result, "skills.registry.exists", "pass", "Project Center skill registry exists", registryRelativePath);
      let registry;
      try {
        registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
      } catch (error) {
        addCheck(result, "skills.registry.parse", "fail", `无法解析项目中心 Skill registry：${error.message}`, registryRelativePath);
        registry = null;
      }
      if (registry) {
        if (registry.schema === "starwork.skill_registry.v0.1") {
          addCheck(result, "skills.registry.schema", "pass", "Project Center skill registry schema is valid", registryRelativePath);
        } else {
          addCheck(result, "skills.registry.schema", "fail", "项目中心 Skill registry schema 不正确。", registryRelativePath);
        }
        const registrySkills = Array.isArray(registry.skills) ? registry.skills : [];
        skills.registry.count = registrySkills.length;
        for (const skill of registrySkills) {
          if (!skill?.id) {
            addCheck(result, "skills.registry.id.exists", "fail", "项目中心 Skill registry 中存在缺少 id 的条目。", registryRelativePath);
            continue;
          }
          checkPathExists(result, workspaceRoot, path.join(skillsRoot.path, skill.id), "skills.registry.source.exists", `Project Center skill source exists: ${skill.id}`, `项目中心托管 Skill 缺少目录：${path.join(skillsRoot.path, skill.id)}`);
        }
      }
    }
  }

  checkRequiredSkillInstallations(result, workspaceRoot, state, manifestSkills);
}

function collectRequiredSkills(state) {
  if (state.workspace_type === "hub" && state.kit === "hub") {
    return (KIT_BUNDLED_SKILLS.hub || []).map((skill) => ({
      ...skill,
      required_by: "kit:hub"
    }));
  }
  return [];
}

function checkRequiredSkillInstallations(result, workspaceRoot, state, manifestSkills) {
  const requiredSkills = collectRequiredSkills(state);
  if (!requiredSkills.length) return;

  const hubPaths = getHubPaths(state);
  const skillsRoot = resolveWorkspaceRolePath(state, "skills", hubPaths.formalSkills);
  const manifestIds = new Set(manifestSkills.map((skill) => skill?.id).filter(Boolean));
  const reports = [];

  for (const required of requiredSkills) {
    const sourcePath = path.join(skillsRoot.path, required.id);
    const skillFilePath = path.join(sourcePath, "SKILL.md");
    const sourceExists = fs.existsSync(path.join(workspaceRoot, skillFilePath));
    const frontmatter = sourceExists
      ? parseSkillFrontmatter(fs.readFileSync(path.join(workspaceRoot, skillFilePath), "utf8"))
      : {};
    const frontmatterOk = sourceExists && Boolean(frontmatter.name) && Boolean(frontmatter.description);
    const mounts = (required.install || [])
      .filter((install) => install.agent !== "hub")
      .map((install) => {
        const mountPath = normalizeRelativePath(install.path);
        return {
          agent: install.agent,
          path: mountPath,
          status: fs.existsSync(path.join(workspaceRoot, mountPath)) ? "ok" : "missing"
        };
      });
    const manifestStatus = manifestIds.has(required.id) ? "ok" : "missing";
    const missingMount = mounts.some((mount) => mount.status !== "ok");
    let status = "ok";
    if (!sourceExists) {
      status = "missing_source";
    } else if (!frontmatterOk) {
      status = "invalid_frontmatter";
    } else if (manifestStatus !== "ok") {
      status = "missing_manifest";
    } else if (missingMount) {
      status = "missing_mount";
    }

    const report = {
      id: required.id,
      required_by: required.required_by,
      status,
      source: {
        path: sourcePath,
        status: sourceExists ? "ok" : "missing",
        path_source: skillsRoot.source
      },
      manifest: {
        path: ".starwork/skills.json",
        status: manifestStatus
      },
      mounts,
      frontmatter: {
        path: skillFilePath,
        status: frontmatterOk ? "ok" : (sourceExists ? "invalid" : "missing")
      },
      repair_hint: "这是 Hub Kit 自带 Skill。请重新运行受控的 StarWork Hub Kit 安装/同步流程，或按文档补齐项目中心内的 Kit Skill；不要把它安装成全局系统 Skill。"
    };
    reports.push(report);

    if (status === "ok") {
      addCheck(result, `skills.required.${slugifyCheckId(required.id)}`, "pass", `Hub required Skill is installed: ${required.id}`, sourcePath);
    } else {
      const missingMounts = mounts.filter((mount) => mount.status !== "ok").map((mount) => mount.path);
      const details = [
        `应在项目中心内存在：${sourcePath}`,
        `应登记在：.starwork/skills.json`,
        ...missingMounts.map((mountPath) => `应挂载给宿主：${mountPath}`)
      ].join("；");
      addCheck(result, `skills.required.${slugifyCheckId(required.id)}`, "warn", `缺少 Hub 自带 Skill：${required.id}。${details}。建议：重新运行受控的 StarWork Hub Kit 安装/同步流程，或按文档补齐项目中心内的 Kit Skill。不要把它安装成全局系统 Skill。`, sourcePath);
    }
  }

  result.skills.required = reports;
}

function checkPathExists(result, workspaceRoot, relativePath, id, passMessage, failMessage) {
  const normalized = normalizeRelativePath(relativePath);
  if (fs.existsSync(path.join(workspaceRoot, normalized))) {
    addCheck(result, id, "pass", passMessage, normalized);
  } else {
    addCheck(result, id, "fail", failMessage, normalized);
  }
}

function normalizeRelativePath(relativePath) {
  return String(relativePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function normalizeSafeRelativePath(relativePath, label) {
  if (typeof relativePath !== "string" || !relativePath.trim()) {
    throw new Error(`${label} 必须是非空相对路径。`);
  }
  const raw = relativePath.replace(/\\/g, "/").trim();
  if (path.isAbsolute(raw) || raw.startsWith("~")) {
    throw new Error(`${label} 不能使用绝对路径或 ~：${relativePath}`);
  }
  const normalized = path.posix.normalize(raw.replace(/^\.\/+/, ""));
  if (normalized === "." || normalized === ".." || normalized.startsWith("../")) {
    throw new Error(`${label} 不能跳出工作区：${relativePath}`);
  }
  if (normalized === ".git" || normalized.startsWith(".git/")) {
    throw new Error(`${label} 不能写入 .git：${relativePath}`);
  }
  if (normalized === "node_modules" || normalized.startsWith("node_modules/")) {
    throw new Error(`${label} 不能写入 node_modules：${relativePath}`);
  }
  return normalized;
}

function normalizeSafeSourcePath(relativePath, sourceRoot, label) {
  const normalized = normalizeSafeRelativePath(relativePath, label);
  const resolvedRoot = path.resolve(sourceRoot);
  const resolved = path.resolve(resolvedRoot, normalized);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`${label} 不能跳出 blueprint 目录：${relativePath}`);
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new Error(`${label} 文件不存在：${relativePath}`);
  }
  return resolved;
}

function resolveWorkspaceSourceFile(workspaceRoot, relativePath, label) {
  const normalized = normalizeSafeRelativePath(relativePath, label);
  const resolvedRoot = path.resolve(workspaceRoot);
  const resolved = path.resolve(resolvedRoot, normalized);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`${label} 不能跳出工作区：${relativePath}`);
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new Error(`${label} 文件不存在：${relativePath}`);
  }
  return resolved;
}

function findStarWorkTrace(dir) {
  const traces = [
    "AGENTS.md",
    "CLAUDE.md",
    "_系统",
    "_system",
    "事项",
    "matters",
    "参考资料",
    "references",
    "输出",
    "outputs"
  ];
  return traces.find((trace) => fs.existsSync(path.join(dir, trace))) || null;
}

function collectInventory(root, options = {}) {
  const maxDepth = parseInventoryDepth(options.inventoryDepth);
  const maxEntries = parseInventoryLimit(options.inventoryLimit);
  const directories = [];
  const files = [];
  const omitted = {
    directories: 0,
    files: 0,
    reason: null
  };
  let totalEntries = 0;

  function walk(current, depth) {
    if (totalEntries >= maxEntries) {
      omitted.reason = "count_limit";
      return;
    }

    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
        .filter((entry) => !shouldOmitInventoryEntry(entry.name))
        .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
    } catch {
      return;
    }

    for (const entry of entries) {
      if (totalEntries >= maxEntries) {
        if (entry.isDirectory()) omitted.directories += 1;
        else if (entry.isFile()) omitted.files += 1;
        omitted.reason = "count_limit";
        continue;
      }

      const absolute = path.join(current, entry.name);
      const relativePath = normalizeRelativePath(path.relative(root, absolute));
      if (!relativePath) continue;

      if (entry.isDirectory()) {
        const childCount = safeChildCount(absolute);
        directories.push({
          path: relativePath,
          depth: depth + 1,
          children_count: childCount
        });
        totalEntries += 1;
        if (depth + 1 < maxDepth) {
          walk(absolute, depth + 1);
        } else if (childCount > 0) {
          omitted.directories += 1;
          omitted.reason = omitted.reason || "depth_limit";
        }
      } else if (entry.isFile()) {
        files.push({
          path: relativePath,
          depth: depth + 1,
          size: safeFileSize(absolute)
        });
        totalEntries += 1;
      }
    }
  }

  walk(root, 0);

  return {
    root,
    max_depth: Number.isFinite(maxDepth) ? maxDepth : "all",
    max_entries: maxEntries,
    directories,
    files,
    omitted
  };
}

function parseInventoryDepth(value) {
  if (!value) return 8;
  if (String(value).toLowerCase() === "all") return Infinity;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error("--inventory-depth 必须是正整数或 all。");
  }
  return parsed;
}

function parseInventoryLimit(value) {
  if (!value) return 5000;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 100) {
    throw new Error("--inventory-limit 必须是大于等于 100 的整数。");
  }
  return parsed;
}

function shouldOmitInventoryEntry(name) {
  return [
    ".git",
    "node_modules",
    ".DS_Store",
    ".cache",
    ".next",
    "dist",
    "build",
    "coverage"
  ].includes(name);
}

function safeChildCount(dir) {
  try {
    return fs.readdirSync(dir).filter((name) => !shouldOmitInventoryEntry(name)).length;
  } catch {
    return 0;
  }
}

function safeFileSize(file) {
  try {
    return fs.statSync(file).size;
  } catch {
    return 0;
  }
}

function detectWorkspaceSignals(inventory) {
  const directories = inventory?.directories || [];
  const files = inventory?.files || [];
  const possibleReferences = directories.filter((dir) => isPossibleReferenceDirectory(dir.path)).map((dir) => dir.path);
  const possibleOutputs = directories.filter((dir) => isPossibleOutputDirectory(dir.path)).map((dir) => dir.path);
  const possibleDrafts = directories.filter((dir) => isPossibleDraftDirectory(dir.path)).map((dir) => dir.path);
  const possibleCurrentWork = directories.filter((dir) => isPossibleCurrentWorkDirectory(dir.path)).map((dir) => dir.path);
  const matterDirs = directories.filter((dir) => isMatterDirectory(dir.path)).map((dir) => dir.path);
  const systemDirs = directories.filter((dir) => isSystemDirectory(dir.path)).map((dir) => dir.path);
  const identityDirs = directories.filter((dir) => isIdentityDirectory(dir.path)).map((dir) => dir.path);
  const lessonsDirs = directories.filter((dir) => isLessonsDirectory(dir.path)).map((dir) => dir.path);
  const hubProjectDirs = directories.filter((dir) => isHubProjectDirectory(dir.path)).map((dir) => dir.path);
  const hubCoordinationDirs = directories.filter((dir) => isHubCoordinationDirectory(dir.path)).map((dir) => dir.path);
  const hubIncomingDirs = directories.filter((dir) => isHubIncomingDirectory(dir.path)).map((dir) => dir.path);
  const hubKnowledgeDirs = directories.filter((dir) => isHubKnowledgeDirectory(dir.path)).map((dir) => dir.path);
  const projectRegistryFiles = files.filter((file) => isProjectRegistryFile(file.path)).map((file) => file.path);
  return {
    agent_entry: files.filter((file) => isAgentEntryFile(file.path)).map((file) => file.path),
    agent_rule_files: files.filter((file) => isAgentEntryFile(file.path) || isAgentRuleFile(file.path)).map((file) => file.path),
    system_dirs: systemDirs,
    matter_dirs: matterDirs,
    possible_reference_dirs: possibleReferences,
    possible_output_dirs: possibleOutputs,
    possible_draft_dirs: possibleDrafts,
    possible_current_work_dirs: possibleCurrentWork,
    project_status_files: files.filter((file) => isProjectStatusFile(file.path)).map((file) => file.path),
    current_work_files: files.filter((file) => isCurrentWorkFile(file.path)).map((file) => file.path),
    decision_files: files.filter((file) => isDecisionFile(file.path)).map((file) => file.path),
    identity_dirs: identityDirs,
    lessons_dirs: lessonsDirs,
    skill_mount_dirs: directories.filter((dir) => isSkillMountDirectory(dir.path)).map((dir) => dir.path),
    hub_project_dirs: hubProjectDirs,
    hub_coordination_dirs: hubCoordinationDirs,
    hub_incoming_dirs: hubIncomingDirs,
    hub_knowledge_dirs: hubKnowledgeDirs,
    project_registry_files: projectRegistryFiles,
    hub_candidate_paths: uniqueList([
      ...hubProjectDirs,
      ...projectRegistryFiles,
      ...hubCoordinationDirs,
      ...hubIncomingDirs,
      ...identityDirs,
      ...lessonsDirs,
      ...hubKnowledgeDirs,
      ...directories.filter((dir) => isSkillMountDirectory(dir.path)).map((dir) => dir.path)
    ]),
    readonly_candidate_dirs: uniqueList([...possibleReferences, ...identityDirs, ...lessonsDirs, ...systemDirs]),
    writable_candidate_dirs: uniqueList([...possibleDrafts, ...possibleCurrentWork, ...possibleOutputs, ...matterDirs]),
    readme_files: files.filter((file) => /^README(\.[a-z0-9]+)?$/i.test(path.basename(file.path))).map((file) => file.path)
  };
}

function isAgentEntryFile(relativePath) {
  return ["AGENTS.md", "CLAUDE.md", ".cursorrules"].includes(relativePath)
    || relativePath.endsWith("/AGENTS.md")
    || relativePath.endsWith("/CLAUDE.md");
}

function isAgentRuleFile(relativePath) {
  const base = path.basename(relativePath).toLowerCase();
  return [".cursorrules", ".cursorignore", "agents.md", "claude.md"].includes(base)
    || relativePath.includes(".agents/")
    || relativePath.includes(".claude/");
}

function isProjectStatusFile(relativePath) {
  const normalized = normalizeRelativePath(relativePath).toLowerCase();
  const base = path.basename(normalized);
  return includesAny(base, ["项目状态", "当前项目", "project-status", "current-project", "current-projects"]);
}

function isCurrentWorkFile(relativePath) {
  const normalized = normalizeRelativePath(relativePath).toLowerCase();
  const base = path.basename(normalized);
  return includesAny(base, ["当前工作", "current-work", "current_work", "todo", "tasks"]);
}

function isDecisionFile(relativePath) {
  const normalized = normalizeRelativePath(relativePath).toLowerCase();
  const base = path.basename(normalized);
  return includesAny(base, ["decisions", "decision", "决策"]);
}

function isSkillMountDirectory(relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  return normalized === "skills"
    || normalized === ".agents/skills"
    || normalized === ".claude/skills"
    || normalized.endsWith("/.agents/skills")
    || normalized.endsWith("/.claude/skills");
}

function isHubProjectDirectory(relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  return normalized === "projects" || normalized === "项目";
}

function isHubCoordinationDirectory(relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  return normalized === "projects/coordination"
    || normalized === "projects/coordination/messages"
    || normalized === "项目/联络";
}

function isHubIncomingDirectory(relativePath) {
  return normalizeRelativePath(relativePath) === ".incoming";
}

function isHubKnowledgeDirectory(relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  return normalized === "knowledge" || normalized === "知识";
}

function isProjectRegistryFile(relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  return normalized === "projects/registry.json" || normalized === "项目/registry.json";
}

function isSystemDirectory(relativePath) {
  const base = basenameLower(relativePath);
  return ["_系统", "_system", "system"].includes(base);
}

function isMatterDirectory(relativePath) {
  const base = basenameLower(relativePath);
  return includesAny(base, ["事项", "matter", "matters"]);
}

function isPossibleReferenceDirectory(relativePath) {
  const base = basenameLower(relativePath);
  return includesAny(base, ["参考", "资料", "素材", "知识", "reference", "references", "ref", "source", "material", "materials", "knowledge"]);
}

function isPossibleOutputDirectory(relativePath) {
  const base = basenameLower(relativePath);
  return includesAny(base, ["输出", "成果", "成稿", "终稿", "交付", "发布", "确认", "output", "outputs", "final", "deliverable", "deliverables", "published", "release"]);
}

function isPossibleDraftDirectory(relativePath) {
  const base = basenameLower(relativePath);
  return includesAny(base, ["草稿", "初稿", "脚本", "draft", "drafts", "script", "scripts"]);
}

function isPossibleCurrentWorkDirectory(relativePath) {
  const base = basenameLower(relativePath);
  return includesAny(base, ["推进", "当前", "任务", "工作台", "work", "working", "tasks", "todo"]);
}

function isIdentityDirectory(relativePath) {
  const base = basenameLower(relativePath);
  return includesAny(base, ["身份", "identity", "profile", "persona"]);
}

function isLessonsDirectory(relativePath) {
  const base = basenameLower(relativePath);
  return includesAny(base, ["教训", "经验", "复盘", "lessons", "learning", "retrospective"]);
}

function basenameLower(relativePath) {
  return path.basename(relativePath).toLowerCase();
}

function includesAny(value, needles) {
  return needles.some((needle) => value.includes(needle));
}

function detectLegacyWorkspace(dir, signals = null) {
  const groups = {
    entryRules: ["AGENTS.md", "CLAUDE.md", ".cursorrules"],
    system: ["_系统", "_system", "system"],
    matters: ["事项", "matters"],
    referencesZh: ["参考资料", "资料", "资料库", "素材", "素材库", "知识"],
    referencesEn: ["references", "reference"],
    outputsZh: ["输出", "成果", "成稿", "终稿", "交付物", "发布记录"],
    outputsEn: ["outputs", "output"],
    identityRoot: ["identity"],
    lessonsRoot: ["lessons"],
    identitySystemZh: ["_系统/身份"],
    lessonsSystemZh: ["_系统/教训"],
    identitySystemEn: ["_system/identity"],
    lessonsSystemEn: ["_system/lessons"],
    projectsRoot: ["projects", "项目"],
    projectRegistry: ["projects/registry.json", "项目/registry.json"],
    coordination: ["projects/coordination", "projects/coordination/messages", "项目/联络"],
    incoming: [".incoming"],
    knowledgeRoot: ["knowledge", "知识"],
    skillsRoot: ["skills"]
  };
  const found = {};
  for (const [key, candidates] of Object.entries(groups)) {
    found[key] = existingRelativePaths(dir, candidates);
  }

  const references = [...found.referencesZh, ...found.referencesEn];
  const outputs = [...found.outputsZh, ...found.outputsEn];
  const signalReferences = signals?.possible_reference_dirs || [];
  const signalOutputs = signals?.possible_output_dirs || [];
  const signalMatters = signals?.matter_dirs || [];
  const signalEntries = signals?.agent_entry || [];
  const signalSystems = signals?.system_dirs || [];
  const signalIdentity = signals?.identity_dirs || [];
  const signalLessons = signals?.lessons_dirs || [];
  const signalHubProjects = signals?.hub_project_dirs || [];
  const signalProjectRegistries = signals?.project_registry_files || [];
  const signalHubCoordination = signals?.hub_coordination_dirs || [];
  const signalHubIncoming = signals?.hub_incoming_dirs || [];
  const signalHubKnowledge = signals?.hub_knowledge_dirs || [];
  const signalSkillMounts = signals?.skill_mount_dirs || [];
  const hasSystem = found.system.length > 0;
  const hasEntry = found.entryRules.length > 0;
  const hasMatters = found.matters.length > 0;
  const hasIdentityOrLessons = [
    ...found.identityRoot,
    ...found.lessonsRoot,
    ...found.identitySystemZh,
    ...found.lessonsSystemZh,
    ...found.identitySystemEn,
    ...found.lessonsSystemEn
  ].length > 0;
  const hubSignals = uniqueList([
    ...found.projectsRoot,
    ...signalHubProjects,
    ...found.projectRegistry,
    ...signalProjectRegistries,
    ...found.coordination,
    ...signalHubCoordination,
    ...found.incoming,
    ...signalHubIncoming,
    ...found.identityRoot,
    ...signalIdentity,
    ...found.lessonsRoot,
    ...signalLessons,
    ...found.knowledgeRoot,
    ...signalHubKnowledge,
    ...found.skillsRoot,
    ...signalSkillMounts
  ]);
  const hasProjectRegistry = found.projectRegistry.length > 0 || signalProjectRegistries.length > 0;
  const hasHubCoordination = found.coordination.length > 0 || signalHubCoordination.length > 0;
  const hasHubLikeRepository = (hasProjectRegistry || ((found.projectsRoot.length + signalHubProjects.length) > 0 && hasHubCoordination))
    && hubSignals.length >= 4;

  const signalCount = [
    hasEntry || signalEntries.length > 0,
    hasSystem || signalSystems.length > 0,
    hasMatters || signalMatters.length > 0,
    references.length > 0 || signalReferences.length > 0,
    outputs.length > 0 || signalOutputs.length > 0,
    hasIdentityOrLessons || signalIdentity.length > 0 || signalLessons.length > 0,
    hasHubLikeRepository
  ].filter(Boolean).length;
  const candidate = signalCount >= 2 || ((references.length > 0 || signalReferences.length > 0) && (outputs.length > 0 || signalOutputs.length > 0));
  const language = inferLegacyLanguage(found);
  const workspaceType = hasHubLikeRepository ? "hub" : "project";
  const reasons = buildLegacyReasons({
    found,
    signalReferences,
    signalOutputs,
    signalMatters,
    signalEntries,
    signalSystems,
    signalIdentity,
    signalLessons,
    hubSignals,
    hasHubLikeRepository,
    language,
    workspaceType
  });
  const primaryTrace = [
    ...found.entryRules,
    ...signalEntries,
    ...found.system,
    ...signalSystems,
    ...found.matters,
    ...signalMatters,
    ...references,
    ...signalReferences,
    ...outputs,
    ...signalOutputs
  ][0] || null;

  return {
    candidate,
    confidence: signalCount >= 4 ? "high" : "medium",
    language,
    workspaceType,
    hubLike: hasHubLikeRepository,
    hubSignals,
    primaryTrace,
    found,
    references: uniqueList([...references, ...signalReferences]),
    outputs: uniqueList([...outputs, ...signalOutputs]),
    reasons
  };
}

function buildLegacyReasons({
  found,
  signalReferences,
  signalOutputs,
  signalMatters,
  signalEntries,
  signalSystems,
  signalIdentity,
  signalLessons,
  hubSignals,
  hasHubLikeRepository,
  language,
  workspaceType
}) {
  const languageReasons = [];
  if (language === "zh") {
    for (const item of [...found.system, ...found.matters, ...found.referencesZh, ...found.outputsZh, ...found.identitySystemZh, ...found.lessonsSystemZh]) {
      languageReasons.push(`${item} 是中文工作区信号`);
    }
  } else {
    for (const item of [...found.system, ...found.matters, ...found.referencesEn, ...found.outputsEn, ...found.identitySystemEn, ...found.lessonsSystemEn]) {
      languageReasons.push(`${item} 是英文工作区信号`);
    }
  }

  const workspaceTypeReasons = workspaceType === "hub"
    ? hubSignals.map((item) => `${item} 表示存在类似项目中心的结构`)
    : ["按 Project 工作台候选处理；事项目录只作为历史内容信号，不再决定工作区类型。"];

  return {
    language: uniqueList(languageReasons),
    workspace_type: uniqueList(workspaceTypeReasons),
    references: uniqueList([...found.referencesZh, ...found.referencesEn, ...signalReferences].map((item) => `${item} 命中参考资料候选信号`)),
    outputs: uniqueList([...found.outputsZh, ...found.outputsEn, ...signalOutputs].map((item) => `${item} 命中成果或输出候选信号`)),
    hub: hasHubLikeRepository ? uniqueList(hubSignals.map((item) => `${item} 命中项目中心候选信号`)) : [],
    candidate: uniqueList([
      ...signalEntries.map((item) => `${item} 是 Agent 入口信号`),
      ...signalSystems.map((item) => `${item} 是系统目录信号`),
      ...signalIdentity.map((item) => `${item} 是身份记忆信号`),
      ...signalLessons.map((item) => `${item} 是经验教训信号`)
    ])
  };
}

function uniqueList(items) {
  return [...new Set(items.filter(Boolean))];
}

function existingRelativePaths(root, candidates) {
  return candidates.filter((relativePath) => fs.existsSync(path.join(root, relativePath)));
}

function inferLegacyLanguage(found) {
  const zhScore = Number(found.system.includes("_系统"))
    + Number(found.matters.includes("事项"))
    + found.referencesZh.length
    + found.outputsZh.length
    + found.identitySystemZh.length
    + found.lessonsSystemZh.length;
  const enScore = Number(found.system.includes("_system"))
    + Number(found.matters.includes("matters"))
    + found.referencesEn.length
    + found.outputsEn.length
    + found.identitySystemEn.length
    + found.lessonsSystemEn.length;
  return enScore > zhScore ? "en" : "zh";
}

function buildLegacySignals(legacy) {
  return {
    candidate: true,
    source: legacy.hubLike ? "hub-like-main-repository" : "legacy-template",
    confidence: legacy.confidence,
    inferred: {
      language: legacy.language,
      workspace_type: legacy.workspaceType,
      references: legacy.references,
      outputs: legacy.outputs,
      hub_like: legacy.hubLike,
      hub_signals: legacy.hubSignals,
      reasons: legacy.reasons
    }
  };
}

function addLegacyChecks(result, legacy) {
  const label = legacy.hubLike ? "项目中心候选" : "历史模板升级候选";
  addCheck(result, "legacy.template.detected", "info", `检测到${label}，置信度：${legacy.confidence}。`, legacy.primaryTrace);
  addCheck(result, "legacy.language.inferred", "info", `推测语言：${legacy.language}。`);
  addCheck(result, "legacy.workspace_type.inferred", "info", `推测工作区类型：${legacy.workspaceType}。`);

  if (legacy.hubLike) {
    addCheck(result, "legacy.hub.detected", "info", `检测到类似项目中心的旧工作区信号：${legacy.hubSignals.join(", ")}。`, legacy.hubSignals[0]);
  }

  if (legacy.references.length) {
    addCheck(result, "legacy.references.detected", "info", `检测到参考资料目录：${legacy.references.join(", ")}。`, legacy.references[0]);
  } else {
    addCheck(result, "legacy.references.detected", "warn", "未检测到常见参考资料目录，升级时可能需要手动指定资料区。");
  }

  if (legacy.outputs.length) {
    addCheck(result, "legacy.outputs.detected", "info", `检测到输出目录：${legacy.outputs.join(", ")}。`, legacy.outputs[0]);
  } else if (!legacy.hubLike) {
    addCheck(result, "legacy.outputs.detected", "warn", "未检测到常见输出目录，升级时可能需要手动指定成果区。");
  }

  if (!legacy.found.entryRules.length) {
    addCheck(result, "legacy.entry_rules.detected", "warn", "未检测到 AGENTS.md、CLAUDE.md 或 Cursor 规则文件，升级后需要补齐 Agent 入口规则。");
  }
}

function checkMultiagentCompatibility(result, workspaceRoot) {
  const report = inspectMultiagentCompatibility(workspaceRoot);
  result.multiagent = {
    status: report.compatibility.status === "current" ? "pass" : "warn",
    lanes_count: report.lanes.length,
    compatibility: report.compatibility
  };
  if (report.compatibility.status === "current") {
    if (report.lanes.length) {
      addCheck(result, "multiagent.compatibility.current", "pass", "MultiAgent 协作记录为当前结构。", ".starwork/agent-lanes/state.json");
    } else {
      addCheck(result, "multiagent.compatibility.not_enabled", "info", "当前工作台尚未启用 MultiAgent；这不是结构问题。");
    }
    return;
  }
  if (report.compatibility.status === "blocked_conflict") {
    addCheck(result, "multiagent.compatibility.conflict", "warn", `检测到旧版 MultiAgent 协作记录存在冲突：${report.conflicts.join("；")}`, ".starwork/agent-lanes/state.json");
    return;
  }
  if (report.compatibility.status === "unknown_partial") {
    addCheck(result, "multiagent.compatibility.partial", "warn", "检测到部分旧版 MultiAgent 协作记录，但机器状态可能损坏；可以读取可见 AI 岗位，写入前需要人工确认。", ".starwork/agent-lanes/state.json");
    return;
  }
  addCheck(result, "multiagent.compatibility.migration_required", "warn", `检测到旧版 MultiAgent 协作记录，目前可以读取已有 AI 岗位；写入新岗位、绑定会话或记录交接前，请先预览迁移：${report.compatibility.migration.dry_run_command}`, ".starwork/agent-lanes/state.json");
}

function addCheck(result, id, level, message, checkPath) {
  result.summary[level] += 1;
  result.checks.push({
    id,
    level,
    message,
    path: checkPath || null
  });
}

function finishDoctor(result, options) {
  result.ok = result.summary.fail === 0;
  result.strict_ok = result.ok && (!options.strict || result.summary.warn === 0);
  result.exitCode = result.strict_ok ? 0 : 1;
  if (options.json) {
    console.log(JSON.stringify(doctorPublicResult(result), null, 2));
  } else {
    printDoctorResult(result, options);
  }
  return result;
}

function doctorPublicResult(result) {
  const { exitCode, ...publicResult } = result;
  return publicResult;
}

function printDoctorResult(result, options) {
  console.log("StarWork 检查结果");
  console.log("");
  console.log(`检查目录：${result.workspace_root || result.target}`);
  if (result.workspace) {
    console.log(`判断：这是${friendlyWorkspaceType(result.workspace.workspace_type)}。`);
    if (result.workspace.language) {
      console.log(`语言：${friendlyLanguage(result.workspace.language)}`);
    }
    if (result.workspace.packs.length) {
      console.log(`已加入的场景能力：${result.workspace.packs.map(friendlyPackName).join("、")}`);
    }
  }
  console.log("");
  console.log("检查概览：");
  console.log(`- 通过：${result.summary.pass} 项`);
  console.log(`- 提醒：${result.summary.info + result.summary.warn} 项`);
  console.log(`- 需要处理：${result.summary.fail} 项`);
  console.log("");

  const visibleChecks = options.verbose
    ? result.checks
    : result.checks.filter((check) => check.level !== "pass");
  if (visibleChecks.length) {
    console.log("需要关注的地方：");
    for (const check of visibleChecks) {
      console.log(`- ${friendlyCheckLevel(check.level)}：${friendlyDoctorMessage(check.message)}`);
      if (check.path) {
        console.log(`  位置：${check.path}`);
      }
    }
    console.log("");
  }

  if (result.upgrade?.candidate) {
    const legacyLabel = result.upgrade.source === "hub-like-main-repository" ? "像项目中心的旧工作区" : "旧工作区";
    console.log("旧目录识别：");
    console.log(`- 这个目录看起来像一个${legacyLabel}，可以进一步让 AI 帮你判断如何无损整理。`);
    console.log(`- 推测语言：${friendlyLanguage(result.upgrade.inferred.language)}`);
    console.log(`- 推测用途：${friendlyWorkspaceType(result.upgrade.inferred.workspace_type)}`);
    console.log("- 这只是识别结果，不会自动移动、删除或修改你的文件。");
    console.log("");
  }

  console.log("结论：");
  if (result.summary.fail > 0) {
    console.log("这个目录还缺少关键文件，需要先处理上面列出的项目。");
  } else if (result.summary.warn > 0) {
    console.log("这个工作台可以继续使用，但建议留意上面的提醒。");
  } else {
    console.log("这个工作台结构完整，可以继续使用。");
  }
}

function friendlyWorkspaceType(type) {
  const labels = {
    project: "一个项目工作台",
    hub: "一个项目中心",
    "single-light": "一个项目工作台",
    "satellite-starter": "一个中心管理的项目工作台"
  };
  return labels[type] || "StarWork 工作台";
}

function friendlyLanguage(language) {
  const labels = {
    zh: "中文",
    en: "英文"
  };
  return labels[language] || language || "未声明";
}

function friendlyPackName(packId) {
  return PACK_LABELS[packId] || packId;
}

function friendlyCheckLevel(level) {
  const labels = {
    info: "提示",
    warn: "提醒",
    fail: "需要处理",
    pass: "已通过"
  };
  return labels[level] || level;
}

function friendlyDoctorMessage(message) {
  const text = String(message || "");
  if (text.includes("缺少 Hub 自带 Skill")) return text;
  return text
    .replace(/这是一个可升级的历史模板工作区，但缺少 \.starwork\/workspace\.json。/g, "这个目录像旧版工作区，但还缺少 StarWork 工作台身份证（.starwork/workspace.json）。")
    .replace(/检测到历史模板升级候选，置信度：(?:high|medium|low)。/g, "这个目录像旧版工作区，可以进一步判断如何整理。")
    .replace(/检测到主库 \/ Hub 候选，置信度：(?:high|medium|low)。/g, "这个目录像项目中心，可以进一步判断如何接入 StarWork。")
    .replace(/推测语言：zh。/g, "推测语言：中文。")
    .replace(/推测语言：en。/g, "推测语言：英文。")
    .replace(/推测工作区类型：project。/g, "推测用途：项目工作台。")
    .replace(/推测工作区类型：hub。/g, "推测用途：项目中心。")
    .replace(/workspace state/g, "工作台身份证")
    .replace(/workspace schema/g, "工作台身份证格式")
    .replace(/workspace core/g, "工作台版本")
    .replace(/workspace_type/g, "工作台类型")
    .replace(/paths\.formal_source/g, "正式成果位置")
    .replace(/paths\.business_work_area/g, "当前资料或工作区位置")
    .replace(/formal source/g, "正式成果位置")
    .replace(/business work area/g, "当前资料或工作区位置")
    .replace(/Kit/g, "基础结构")
    .replace(/kit/g, "基础结构")
    .replace(/Pack/g, "场景能力")
    .replace(/pack/g, "场景能力")
    .replace(/Core/g, "StarWork")
    .replace(/Agent/g, "AI")
    .replace(/Skill/g, "AI 使用说明")
    .replace(/schema/g, "格式")
    .replace(/Blueprint/g, "升级方案")
    .replace(/blueprint/g, "升级方案");
}

function readValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} 需要一个值。`);
  }
  return value;
}

async function chooseWorkspaceType(options) {
  if (options.yes || !process.stdin.isTTY) {
    return "project";
  }
  return choose("第 1 步：你要创建哪种工作台？", [
    ["project", "项目工作台（推荐）：具体项目执行，资料、草稿、成果分开"],
    ["hub", "项目中心：统一维护身份、教训、知识、skills 和项目登记"]
  ], { defaultIndex: 0 });
}

function normalizeWorkspaceType(workspaceType) {
  if (workspaceType === "single-light") return "project";
  return workspaceType;
}

function normalizeWorkspaceTypeForSupport(workspaceType) {
  if (["project", "single-light", "satellite-starter"].includes(workspaceType)) {
    return "project";
  }
  return workspaceType;
}

function warnDeprecatedWorkspaceType(requested, normalized) {
  if (requested && requested !== normalized) {
    console.warn(`提示：${requested} 已进入兼容期，本次按 ${normalized} 工作台处理。`);
  }
}

async function choosePack(workspaceType, workspaceConfig, options) {
  if (workspaceType === "hub") {
    if (!options.yes && process.stdin.isTTY) {
      console.log("");
      console.log("第 3 步：项目中心会自动使用项目中心管理能力，不需要再选择场景能力。");
    }
    return workspaceConfig.defaultPack;
  }

  if (options.yes || !process.stdin.isTTY) {
    return workspaceConfig.defaultPack;
  }

  console.log("");
  console.log("第 3 步：v0.1 单项目先使用通用工作 Pack（general）。");
  console.log("内容创作者等场景 Pack 还在定稿中，暂不在交互流程里主动推荐。");
  return workspaceConfig.defaultPack;
}

function printInitIntro(options, targetDir) {
  if (options.yes || !process.stdin.isTTY) return;
  console.log("");
  console.log("可以，我先简单说清楚 StarWork 在做什么。");
  console.log("");
  console.log("StarWork 是给 AI 协作准备的项目工作台。它会把项目说明、当前任务、协作规则、交接记录和健康检查入口放到固定位置，让 AI 每次进入项目时不用从零猜上下文。");
  console.log("");
  console.log("这次我会带你做三件事：");
  console.log("1. 确认这个工作台服务哪个项目；");
  console.log("2. 预览 StarWork 准备补哪些协作文件；");
  console.log("3. 你确认后再正式写入，并做一次检查。");
  console.log("");
  console.log(`目标目录：${targetDir}`);
  console.log("我会先预览，不会直接改你的业务代码，也不会直接覆盖已有 AI 规则文件。");
}

async function chooseLanguage(options) {
  if (options.yes || !process.stdin.isTTY) {
    return "zh";
  }
  return choose("第 2 步：工作台使用哪种语言？", [
    ["zh", "中文（推荐）：目录、规则和 Pack 内容使用中文"],
    ["en", "English：目录、规则和 Pack 内容使用英文镜像"]
  ], { defaultIndex: 0 });
}

function validateLanguage(language) {
  if (!["zh", "en"].includes(language)) {
    throw new Error(`不支持的语言：${language}。可选值：zh、en。`);
  }
}

async function choose(question, choices, { defaultIndex = 0 } = {}) {
  console.log("");
  console.log(question);
  choices.forEach(([_, label], index) => {
    const marker = index === defaultIndex ? "（默认）" : "";
    console.log(`${index + 1}. ${label}${marker}`);
  });

  while (true) {
    const answer = await ask("请输入序号，或直接回车使用默认项：");
    const trimmed = answer.trim();
    if (!trimmed) {
      return choices[defaultIndex][0];
    }
    const index = Number(trimmed) - 1;
    if (choices[index]) {
      return choices[index][0];
    }
    console.log("没有这个选项，请重新输入。");
  }
}

async function confirm(question, defaultValue) {
  const suffix = defaultValue ? "Y/n" : "y/N";
  const answer = await ask(`${question} (${suffix}) `);
  const normalized = answer.trim().toLowerCase();
  if (!normalized) return defaultValue;
  return normalized === "y" || normalized === "yes";
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function buildInitPlan({ targetDir, workspaceName, workspaceType, workspaceConfig, pack, formalSource, businessWorkArea, blueprint = null, includeSkills = true, enableKnowledge = false, agentDocsMode = "draft" }) {
  const kitDir = path.join(PRODUCT_ROOT, "core", "kits", workspaceConfig.kit);
  if (!fs.existsSync(kitDir)) {
    throw new Error(`找不到 Kit：${workspaceConfig.kit}`);
  }

  const resolvedPackPaths = resolveInitPackPaths(pack, blueprint, {
    formalSource,
    businessWorkArea
  });
  const actions = [];
  const variables = {
    blueprint,
    workspace: {
      name: workspaceName,
      type: workspaceType
    },
    pack,
    paths: resolvedPackPaths,
    overrides: {
      ...(pack.overrides || {}),
      formal_source: formalSource,
      business_work_area: businessWorkArea
    }
  };
  const packRuleSlots = renderPackRuleSlots(pack, variables, "场景规则");
  const blueprintRuleSlots = renderInitBlueprintRuleSlots(blueprint, variables);
  const hasKnowledgeRule = enableKnowledge && workspaceType !== "hub";
  const agentDocsEntries = [];

  for (const source of walkFiles(kitDir)) {
    const sourceRelativePath = normalizeRelativePath(path.relative(kitDir, source));
    if (shouldSkipStandaloneProjectKitFile(sourceRelativePath, workspaceType)) continue;
    const relativePath = mapKitRelativePathForWorkspace(sourceRelativePath, workspaceConfig.kit, pack.language || "zh");
    let content = fs.readFileSync(source, "utf8");
    content = renderText(content, variables);
    if (workspaceConfig.kit === "project") {
      content = renderProjectKitContent(relativePath, content, { language: pack.language || "zh", pack });
    }
    if (workspaceConfig.kit === "hub") {
      content = renderHubKitContent(relativePath, content, { language: pack.language || "zh" });
    }
    if (relativePath === "AGENTS.md" && blueprint) {
      content = renderInitBlueprintAgents({
        language: pack.language || "zh",
        blueprint,
        variables,
        hasExtraRules: packRuleSlots.length > 0 || blueprintRuleSlots.length > 0 || hasKnowledgeRule
      });
    }
    if (relativePath === "AGENTS.md" && (packRuleSlots.length || blueprintRuleSlots.length || hasKnowledgeRule)) {
      content = ensureRulesIndexReference(content);
    }
    const semanticAction = maybeAgentDocDraftAction(targetDir, relativePath, content, agentDocsMode);
    if (semanticAction?.action) {
      actions.push(semanticAction.action);
      agentDocsEntries.push(semanticAction.entry);
      continue;
    }
    if (semanticAction?.skip) continue;
    actions.push(fileAction(targetDir, relativePath, content));
  }
  actions.push(...buildRuleSlotActions(targetDir, packRuleSlots));
  actions.push(...buildRuleSlotActions(targetDir, blueprintRuleSlots));

  for (const rolePath of Object.values(resolvedPackPaths || {})) {
    actions.push(directoryAction(targetDir, rolePath));
  }
  actions.push(...buildPackDirectoryActions(targetDir, pack, variables));
  for (const folder of blueprint?.folders || []) {
    actions.push(directoryAction(targetDir, normalizeSafeRelativePath(folder, "init blueprint folders")));
  }

  for (const seed of pack.seed || []) {
    const source = path.join(pack.__dir, seed.from);
    if (!fs.existsSync(source)) {
      throw new Error(`Pack seed 不存在：${pack.id}/${seed.from}`);
    }
    const content = renderText(fs.readFileSync(source, "utf8"), variables);
    actions.push(fileAction(targetDir, seed.to, content));
  }
  actions.push(...buildInitBlueprintSeedActions(targetDir, blueprint, variables));

  for (const template of pack.templates || []) {
    const source = path.join(pack.__dir, template.from);
    if (!fs.existsSync(source)) {
      throw new Error(`Pack template 不存在：${pack.id}/${template.from}`);
    }
    const target = path.join(".starwork", "packs", pack.id, "templates", path.basename(template.from));
    const content = renderText(fs.readFileSync(source, "utf8"), variables);
    actions.push(fileAction(targetDir, target, content));
  }

  const kitSkillPlan = includeSkills
    ? buildKitSkillPlan({ targetDir, kit: workspaceConfig.kit, language: pack.language || "zh", installedBy: "starwork init" })
    : { actions: [], records: [] };
  const knowledgeSkillPlan = enableKnowledge && workspaceType !== "hub"
    ? buildKnowledgeProjectSkillPlan({ targetDir, language: pack.language || "zh", installedBy: "starwork init --knowledge" })
    : { actions: [], records: [] };
  actions.push(...kitSkillPlan.actions);
  actions.push(...knowledgeSkillPlan.actions);
  if (workspaceType === "hub") {
    const hubPaths = getHubStandardPaths(pack.language || "zh");
    actions.push(fileAction(targetDir, path.join(hubPaths.formalSkills, "registry.json"), renderHubSkillRegistry([])));
  }

  const workspaceState = {
    schema: "starwork.workspace.v0.1",
    core: "0.1",
    workspace_type: workspaceType,
    kit: workspaceConfig.kit,
    packs: [
      {
        id: pack.id,
        version: pack.version || "0.1.0",
        paths: resolvedPackPaths,
        installed_at: new Date().toISOString()
      }
    ],
    language: pack.language || "zh",
    paths: {
      formal_source: formalSource,
      business_work_area: businessWorkArea,
      ...(workspaceType === "hub" ? {
        ...getHubStatePathsForLanguage(pack.language || "zh")
      } : {})
    },
    ...(enableKnowledge && workspaceType !== "hub" ? {
      capabilities: {
        knowledge: renderKnowledgeCapabilityRecord(pack.language || "zh", getKnowledgeDefaultRoot(pack.language || "zh"))
      }
    } : {}),
    ...(blueprint ? {
      customization: {
        type: "init_blueprint",
        schema: blueprint.schema,
        source: path.basename(blueprint.__path),
        folders: (blueprint.folders || []).map((folder) => normalizeSafeRelativePath(folder, "init blueprint folders")),
        directories: normalizeInitDirectoryPlan(blueprint, variables).map((directory) => ({
          path: directory.path,
          purpose: directory.purpose,
          write_policy: directory.write_policy,
          planned: directory.planned
        })),
        removals: (blueprint.removals || []).map((item) => normalizeSafeRelativePath(item, "init blueprint removals")),
        agent_rules: (blueprint.agent_rules || []).map((rule) => ({
          slot: rule.slot,
          from: normalizeSafeRelativePath(rule.from, "init blueprint agent_rules.from")
        })),
        seed: (blueprint.seed || []).map((seed) => ({
          from: normalizeSafeRelativePath(seed.from, "init blueprint seed.from"),
          to: normalizeSafeRelativePath(seed.to, "init blueprint seed.to")
        }))
      }
    } : {}),
    created_by: blueprint ? "starwork init --blueprint" : "starwork init"
  };
  if (enableKnowledge && workspaceType !== "hub") {
    const knowledgeRoot = getKnowledgeDefaultRoot(pack.language || "zh");
    actions.push(...buildKnowledgeStructureActions(targetDir, pack.language || "zh", knowledgeRoot));
    actions.push(...buildKnowledgeRuleActions(targetDir, pack.language || "zh", knowledgeRoot));
  }
  actions.push(fileAction(targetDir, path.join(".starwork", "workspace.json"), `${JSON.stringify(workspaceState, null, 2)}\n`));
  actions.push(fileAction(targetDir, path.join(".starwork", "skills.json"), renderProjectSkillsManifest(mergeSkillRecords(kitSkillPlan.records, knowledgeSkillPlan.records))));
  const agentDocsPlanAction = buildAgentDocsPlanAction(targetDir, "init", agentDocsEntries);
  if (agentDocsPlanAction) actions.push(agentDocsPlanAction);

  const filteredActions = blueprint?.removals?.length
    ? actions.filter((action) => !matchesAnyRemovedPath(action.relativePath, blueprint.removals))
    : actions;

  return {
    targetDir,
    workspaceName,
    workspaceType,
    workspaceLabel: workspaceConfig.label,
    kit: workspaceConfig.kit,
    language: pack.language || "zh",
    pack,
    blueprint,
    formalSource,
    businessWorkArea,
    knowledgeRoot: enableKnowledge && workspaceType !== "hub" ? getKnowledgeDefaultRoot(pack.language || "zh") : null,
    agentDocs: agentDocsEntries.length ? { status: "draft_required", entries: agentDocsEntries } : null,
    workspaceState,
    targetExists: fs.existsSync(targetDir),
    skills: mergeSkillRecords(kitSkillPlan.records, knowledgeSkillPlan.records),
    actions: dedupeActions(filteredActions)
  };
}

function normalizeInitDirectoryPlan(blueprint, variables) {
  if (!blueprint) return [];
  const byPath = new Map();
  const addDirectory = ({ path: relativePath, purpose, write_policy, planned = false, sourceRank = 0 }) => {
    if (!relativePath) return;
    const normalized = normalizeSafeRelativePath(relativePath, "init blueprint directory path");
    if (matchesAnyRemovedPath(normalized, blueprint.removals || [])) return;
    const current = byPath.get(normalized);
    if (current && current.sourceRank >= sourceRank) return;
    byPath.set(normalized, {
      path: normalized.endsWith("/") ? normalized : `${normalized}/`,
      purpose: purpose || "自定义工作区目录。",
      write_policy: write_policy || "writable",
      planned: Boolean(planned),
      sourceRank
    });
  };

  const paths = {
    ...(variables.paths || {}),
    ...(variables.overrides || {})
  };
  if (paths.references) {
    addDirectory({
      path: paths.references,
      purpose: "存放用户提供的原始资料和参考信息。",
      write_policy: "read_only_by_default",
      sourceRank: 1
    });
  }
  if (paths.business_work_area || paths.drafts) {
    addDirectory({
      path: paths.business_work_area || paths.drafts,
      purpose: "存放 AI 生成的草稿、方案和中间版本。",
      write_policy: "writable",
      sourceRank: 1
    });
  }
  if (paths.formal_source || paths.final) {
    addDirectory({
      path: paths.formal_source || paths.final,
      purpose: "存放用户确认后的最终成果。",
      write_policy: "confirm_before_write",
      sourceRank: 1
    });
  }

  for (const folder of blueprint.folders || []) {
    addDirectory({
      path: folder,
      purpose: "按用户需求保留的固定工作区目录。",
      write_policy: "writable",
      sourceRank: 2
    });
  }
  for (const directory of blueprint.directories || []) {
    addDirectory({
      path: directory.path,
      purpose: directory.purpose || "按用户需求保留的固定工作区目录。",
      write_policy: directory.write_policy || "writable",
      planned: Boolean(directory.planned),
      sourceRank: 3
    });
  }
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function renderInitBlueprintAgents({ language, blueprint, variables, hasExtraRules }) {
  const directories = normalizeInitDirectoryPlan(blueprint, variables);
  if (language === "en") {
    const rows = directories.map((directory) => `| \`${directory.path}\` | ${directory.purpose}${directory.planned ? " Planned placeholder." : ""} | ${friendlyWritePolicy(directory.write_policy, "en")} |`);
    return `# Workspace Rules

## Read First

1. \`_system/context/current-project.md\`
2. \`_system/tasks/current-work.md\`
${hasExtraRules ? "3. `.starwork/rules/index.md` when it exists\n" : ""}
## Workspace Directories

| Directory | Use | Write Rule |
|---|---|---|
${rows.join("\n") || "| `(none)` | No custom business directories were declared. | Ask the user before adding top-level folders. |"}

## Write Boundaries

- Do not rewrite source materials unless the user explicitly asks.
- Drafts and intermediate work belong in the declared writable work area.
- User-approved outputs belong in the confirmed output directory.
- Do not create default folders that are not listed above unless the user confirms them.

## Confirmation Required

- Changing identity or stable preferences.
- Promoting drafts into the formal source of truth.
- Changing workspace structure or top-level business folders.
`;
  }
  const rows = directories.map((directory) => `| \`${directory.path}\` | ${directory.purpose}${directory.planned ? " 这是计划目录。" : ""} | ${friendlyWritePolicy(directory.write_policy, "zh")} |`);
  return `# StarWork 工作区规则

## 开始前先读

1. \`_系统/上下文/当前项目.md\`
2. \`_系统/任务/当前工作.md\`
${hasExtraRules ? "3. `.starwork/rules/index.md`（如果存在）\n" : ""}
## 工作区目录说明

| 目录 | 用途 | 写入规则 |
|---|---|---|
${rows.join("\n") || "| `(无)` | 未声明自定义业务目录。 | 新增顶层目录前先确认。 |"}

## 写入边界

- 原始资料默认不改写，除非用户明确要求。
- 草稿、方案和中间版本先进入声明的可写工作区。
- 用户确认后的成果进入确认成果目录。
- 不要创建上表之外的默认目录，除非用户确认。

## 需要确认

- 修改身份或稳定偏好。
- 将草稿晋升为正式事实源。
- 改变工作台结构或顶层业务目录。
`;
}

function friendlyWritePolicy(policy, language = "zh") {
  const normalized = String(policy || "").trim();
  const zh = {
    read_only_by_default: "默认只读；不要改写原始资料。",
    writable: "可以写入草稿、过程材料和中间版本。",
    confirm_before_write: "写入或覆盖前需要用户确认。",
    planned_placeholder: "计划目录；创建或写入前先确认。"
  };
  const en = {
    read_only_by_default: "Read-only by default; do not rewrite source materials.",
    writable: "Writable for drafts, working notes, and intermediate versions.",
    confirm_before_write: "Ask the user before writing or overwriting.",
    planned_placeholder: "Planned placeholder; confirm before creating or writing."
  };
  const table = language === "en" ? en : zh;
  return table[normalized] || normalized || table.writable;
}

function shouldSkipStandaloneProjectKitFile(relativePath, workspaceType) {
  if (workspaceType !== "project") return false;
  const normalized = normalizeRelativePath(relativePath);
  return normalized === ".core-sync.json"
    || normalized.startsWith(".internal/")
    || normalized.startsWith("_系统/主库同步/");
}

function buildKitSkillPlan({ targetDir, kit, language = "zh", installedBy }) {
  const now = new Date().toISOString();
  const actions = [];
  const records = [];
  const skills = KIT_BUNDLED_SKILLS[kit] || [];

  for (const skill of skills) {
    const sourceDir = path.join(PRODUCT_ROOT, skill.source);
    if (!fs.existsSync(sourceDir)) {
      throw new Error(`Kit ${kit} 声明的 Skill 不存在：${skill.id}`);
    }

    const mounts = [];
    for (const install of skill.install || []) {
      const installPath = mapKitSkillInstallPath(install.path, kit, language);
      if (install.mode === "copy") {
        actions.push(...copyDirectoryFiles(PRODUCT_ROOT, skill.source, targetDir, installPath));
      } else if (install.mode === "symlink") {
        if (!install.source) {
          throw new Error(`Skill ${skill.id} 的 symlink 安装缺少 source。`);
        }
        actions.push(symlinkAction(targetDir, installPath, path.join(targetDir, mapKitSkillInstallPath(install.source, kit, language))));
      } else {
        throw new Error(`Skill ${skill.id} 不支持安装模式：${install.mode}`);
      }
      mounts.push({
        agent: install.agent,
        path: normalizeRelativePath(installPath),
        mode: install.mode
      });
    }

    records.push({
      id: skill.id,
      name: skill.name,
      type: skill.type || "kit-bundled",
      source: {
        kind: skill.sourceKind || "kit",
        kit,
        manifest_id: skill.id
      },
      distribution: skill.distribution || "copy",
      mounts,
      reason: skill.reason,
      installed_by: installedBy,
      installed_at: now
    });
  }

  return { actions, records };
}

function mapKitSkillInstallPath(relativePath, kit, language = "zh") {
  const normalized = normalizeRelativePath(relativePath);
  if (kit === "hub" && language === "zh") {
    return normalized.replace(/^skills(?=\/|$)/, "技能");
  }
  return normalized;
}

function renderProjectSkillsManifest(records) {
  return `${JSON.stringify({
    schema: "starwork.project_skills.v0.1",
    updated_at: new Date().toISOString(),
    skills: records
  }, null, 2)}\n`;
}

function readProjectSkillsManifest(workspaceRoot) {
  const manifestPath = path.join(workspaceRoot, ".starwork", "skills.json");
  if (!fs.existsSync(manifestPath)) {
    return {
      schema: "starwork.project_skills.v0.1",
      skills: []
    };
  }
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    return {
      ...manifest,
      skills: Array.isArray(manifest.skills) ? manifest.skills : []
    };
  } catch (error) {
    throw new Error(`无法读取项目 Skill 清单：${error.message}`);
  }
}

function mergeSkillRecords(existingRecords, newRecords) {
  const map = new Map();
  for (const record of existingRecords || []) {
    if (record?.id) map.set(record.id, record);
  }
  for (const record of newRecords || []) {
    if (record?.id) map.set(record.id, record);
  }
  return Array.from(map.values());
}

function buildKnowledgeProjectSkillPlan({ targetDir, language = "zh", installedBy }) {
  const sourceDir = path.join(PRODUCT_ROOT, KNOWLEDGE_PROJECT_SKILL_SOURCE);
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`缺少知识库项目内 Skill：${KNOWLEDGE_PROJECT_SKILL_ID}`);
  }

  const mounts = [
    { agent: "codex", path: path.join(".agents", "skills", KNOWLEDGE_PROJECT_SKILL_ID), mode: "copy" },
    { agent: "claude", path: path.join(".claude", "skills", KNOWLEDGE_PROJECT_SKILL_ID), mode: "copy" }
  ];
  const actions = mounts.flatMap((mount) => copyDirectoryFiles(PRODUCT_ROOT, KNOWLEDGE_PROJECT_SKILL_SOURCE, targetDir, mount.path, { idempotent: true }));

  return {
    actions,
    records: [{
      id: KNOWLEDGE_PROJECT_SKILL_ID,
      name: "StarWork Knowledge Project",
      type: "capability-bundled",
      source: {
        kind: "core-capability",
        capability: "knowledge",
        manifest_id: KNOWLEDGE_PROJECT_SKILL_ID
      },
      distribution: "copy",
      mounts: mounts.map((mount) => ({
        agent: mount.agent,
        path: normalizeRelativePath(mount.path),
        mode: mount.mode
      })),
      reason: language === "en"
        ? "Installed after enabling the local project knowledge base."
        : "开启项目本地知识库后安装，用于维护当前项目知识库。",
      installed_by: installedBy,
      installed_at: new Date().toISOString()
    }]
  };
}

function renderHubSkillRegistry(skills) {
  return `${JSON.stringify({
    schema: "starwork.skill_registry.v0.1",
    owner: "hub",
    updated_at: new Date().toISOString(),
    skills
  }, null, 2)}\n`;
}

function buildSpawnSkillPlan({ hubRoot, hubPaths, targetDir, blueprint, kit, language = "zh", installedBy }) {
  const registry = readHubSkillRegistry(hubRoot, hubPaths);
  const registrySkills = Array.isArray(registry.skills) ? registry.skills : [];
  const kitPlan = buildKitSkillPlan({ targetDir, kit, language, installedBy });
  const kitSkillIds = new Set(kitPlan.records.map((record) => record.id));
  for (const requestedSkill of blueprint?.skills || []) {
    if (requestedSkill.source === "kit" && !kitSkillIds.has(requestedSkill.id)) {
      throw new Error(`Kit ${kit} 未声明自带 Skill：${requestedSkill.id}`);
    }
  }
  const selected = selectSpawnSkills(registrySkills, blueprint);
  const now = new Date().toISOString();
  const actions = [...kitPlan.actions];
  const records = [...kitPlan.records];

  for (const selectedSkill of selected) {
    const registrySkill = registrySkills.find((skill) => skill.id === selectedSkill.id);
    if (!registrySkill) {
      throw new Error(`项目中心托管 Skill 未登记：${selectedSkill.id}`);
    }
    const distribution = selectedSkill.distribution || registrySkill.distribution?.mode || "symlink";
    if (!["symlink", "copy"].includes(distribution)) {
      throw new Error(`项目中心托管 Skill ${selectedSkill.id} 的分发模式不支持：${distribution}`);
    }
    const sourceDir = path.join(hubRoot, hubPaths.formalSkills, selectedSkill.id);
    if (!fs.existsSync(sourceDir)) {
      throw new Error(`项目中心托管 Skill 缺少目录：skills/${selectedSkill.id}`);
    }

    const mounts = [];
    for (const agent of ["codex", "claude"]) {
      const base = agent === "codex" ? path.join(".agents", "skills") : path.join(".claude", "skills");
      const target = path.join(base, selectedSkill.id);
      if (distribution === "symlink") {
        actions.push(symlinkAction(targetDir, target, sourceDir));
      } else {
        actions.push(...copyDirectoryFiles(hubRoot, path.join(hubPaths.formalSkills, selectedSkill.id), targetDir, target));
      }
      mounts.push({
        agent,
        path: normalizeRelativePath(target),
        mode: distribution
      });
    }

    records.push({
      id: selectedSkill.id,
      name: registrySkill.name || selectedSkill.id,
      type: registrySkill.type || "hub-managed",
      source: {
        kind: "hub",
        hub_path: hubRoot,
        registry_id: selectedSkill.id
      },
      distribution,
      mounts,
      reason: selectedSkill.reason || registrySkill.description || "项目中心托管 Skill 按本次 spawn 选择分发。",
      installed_by: installedBy,
      installed_at: now
    });
  }

  return { actions, records };
}

function selectSpawnSkills(registrySkills, blueprint) {
  const selected = [];
  const seen = new Set();
  for (const skill of blueprint?.skills || []) {
    if (skill.source && skill.source !== "hub") continue;
    selected.push(skill);
    seen.add(skill.id);
  }
  for (const skill of registrySkills) {
    if (!skill?.id || seen.has(skill.id)) continue;
    if (skill.distribution?.default_for_spawn) {
      selected.push({
        id: skill.id,
        source: "hub",
        distribution: skill.distribution.mode,
        reason: skill.description
      });
      seen.add(skill.id);
    }
  }
  return selected;
}

function readHubSkillRegistry(hubRoot, hubPaths = null) {
  const registryPath = hubPaths
    ? path.join(hubRoot, hubPaths.formalSkills, "registry.json")
    : findFirstExistingPath(hubRoot, [
      path.join("技能", "registry.json"),
      path.join("skills", "registry.json")
    ]);
  if (!fs.existsSync(registryPath)) {
    return {
      schema: "starwork.skill_registry.v0.1",
      owner: "hub",
      skills: []
    };
  }
  let registry;
  try {
    registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  } catch (error) {
    throw new Error(`无法读取项目中心 Skill registry：${error.message}`);
  }
  if (registry.schema !== "starwork.skill_registry.v0.1") {
    throw new Error("项目中心 Skill registry schema 必须是 starwork.skill_registry.v0.1。");
  }
  if (!Array.isArray(registry.skills)) {
    throw new Error("项目中心 Skill registry 的 skills 必须是数组。");
  }
  return registry;
}

function findFirstExistingPath(root, relativePaths) {
  for (const relativePath of relativePaths) {
    const fullPath = path.join(root, relativePath);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return path.join(root, relativePaths[0]);
}

function resolveHubRoot(hubPath) {
  const resolved = path.resolve(hubPath);
  return requireWorkspaceRoot(resolved);
}

function assertHealthyHub(hubRoot, hubState) {
  if (hubState.workspace_type !== "hub" || hubState.kit !== "hub") {
    throw new Error("spawn 必须从项目中心执行。请先运行 starwork init --type hub 创建项目中心。");
  }
  const health = doctorCollect(hubRoot);
  if (health.summary.fail > 0) {
    throw new Error("项目中心未通过 doctor 检查，请先修复阻塞问题。");
  }
  const hubPaths = getHubPaths(hubState);
  const required = [
    hubPaths.projectRegistry,
    hubPaths.identity,
    hubPaths.lessons,
    hubPaths.formalSkills,
    hubPaths.knowledge
  ];
  for (const relativePath of required) {
    if (!fs.existsSync(path.join(hubRoot, relativePath))) {
      throw new Error(`项目中心缺少必要资源：${relativePath}`);
    }
  }
}

function getHubPaths(hubState = {}) {
  const defaults = getHubStandardPaths(hubState.language || "en");
  return {
    identity: hubState.paths?.identity || defaults.identity,
    lessons: hubState.paths?.lessons || defaults.lessons,
    projectRegistry: hubState.paths?.project_registry || defaults.projectRegistry,
    coordination: hubState.paths?.coordination || defaults.coordination,
    localHandoff: hubState.paths?.local_handoff || defaults.localHandoff,
    incoming: hubState.paths?.incoming || defaults.incoming,
    formalSkills: hubState.paths?.formal_skills || defaults.formalSkills,
    draftsAndExperiments: hubState.paths?.drafts_and_experiments || defaults.draftsAndExperiments,
    knowledge: hubState.paths?.knowledge || defaults.knowledge
  };
}

function assertSpawnTargetIsEmpty(targetDir) {
  const existingWorkspace = fs.existsSync(targetDir) ? findWorkspaceRoot(targetDir) : null;
  if (existingWorkspace) {
    throw new Error("目标目录已经位于 StarWork 工作台内，请换一个空目录。");
  }
  if (!fs.existsSync(targetDir)) return;
  if (!fs.statSync(targetDir).isDirectory()) {
    throw new Error("spawn 目标必须是目录。");
  }
  const entries = fs.readdirSync(targetDir).filter((entry) => entry !== ".DS_Store");
  if (entries.length > 0) {
    throw new Error("spawn v0.1 只写入不存在或空目录，目标目录已有内容。");
  }
}

function loadSpawnBlueprint(blueprintPath) {
  const filePath = path.resolve(blueprintPath);
  let blueprint;
  try {
    blueprint = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`无法读取 blueprint：${error.message}`);
  }
  if (blueprint.schema !== "starwork.spawn_blueprint.v0.1") {
    throw new Error("blueprint schema 必须是 starwork.spawn_blueprint.v0.1。");
  }
  if (!blueprint.name || typeof blueprint.name !== "string") {
    throw new Error("blueprint 缺少项目名称 name。");
  }
  if (!blueprint.base || typeof blueprint.base !== "object") {
    throw new Error("blueprint 缺少 base 配置。");
  }
  if (blueprint.base.language && !["zh", "en"].includes(blueprint.base.language)) {
    throw new Error("spawn blueprint v0.1 只支持 language=zh 或 language=en。");
  }
  return {
    ...blueprint,
    __path: filePath,
    __dir: path.dirname(filePath)
  };
}

function validateSpawnBlueprintForMode(blueprint, requestedMode, mode, modeConfig) {
  if (!blueprint) return;
  if (blueprint.base.mode && normalizeSpawnMode(blueprint.base.mode) !== mode) {
    throw new Error(`blueprint base.mode (${blueprint.base.mode}) 与本次 spawn 模式 (${requestedMode}) 不一致。`);
  }
  if (blueprint.base.language && blueprint.base.language !== modeConfig.language) {
    throw new Error(`blueprint base.language (${blueprint.base.language}) 与本次 spawn 语言 (${modeConfig.language}) 不一致。`);
  }
  if (blueprint.base.kit && normalizeKitId(blueprint.base.kit) !== modeConfig.kit) {
    throw new Error(`blueprint base.kit (${blueprint.base.kit}) 与模式 ${mode} 的 Kit (${modeConfig.kit}) 不匹配。`);
  }
  if (blueprint.renames && Object.keys(blueprint.renames).length > 0) {
    throw new Error("spawn blueprint v0.1 暂不支持 renames。");
  }
  if (blueprint.removals && blueprint.removals.length > 0) {
    throw new Error("spawn blueprint v0.1 暂不支持 removals。");
  }
  for (const relativePath of Object.values(blueprint.paths || {})) {
    normalizeSafeRelativePath(relativePath, "blueprint.paths");
  }
  for (const folder of blueprint.folders || []) {
    normalizeSafeRelativePath(folder, "blueprint.folders");
  }
  for (const rule of blueprint.agent_rules || []) {
    normalizeSafeSourcePath(rule.from, blueprint.__dir, "blueprint.agent_rules.from");
    if (!rule.slot || typeof rule.slot !== "string") {
      throw new Error("blueprint agent_rules 每一项都必须包含 slot。");
    }
  }
  for (const seed of blueprint.seed || []) {
    normalizeSafeSourcePath(seed.from, blueprint.__dir, "blueprint.seed.from");
    normalizeSafeRelativePath(seed.to, "blueprint.seed.to");
    const conflict = seed.on_conflict || "error";
    if (!["error", "skip", "create_new"].includes(conflict)) {
      throw new Error("blueprint seed.on_conflict 只支持 error、skip 或 create_new。");
    }
  }
  for (const skill of blueprint.skills || []) {
    if (!skill?.id || typeof skill.id !== "string") {
      throw new Error("blueprint skills 每一项都必须包含 id。");
    }
    if (skill.source && !["hub", "kit"].includes(skill.source)) {
      throw new Error("blueprint skill.source 只支持 hub 或 kit。");
    }
    if (skill.distribution && !["symlink", "copy"].includes(skill.distribution)) {
      throw new Error("blueprint skill.distribution 只支持 symlink 或 copy。");
    }
  }
}

function normalizeSpawnMode(mode) {
  if (!mode || mode === "starter") return "project";
  return mode;
}

function normalizeKitId(kit) {
  if (["local-starter", "satellite-starter"].includes(kit)) return "project";
  return kit;
}

function warnDeprecatedSpawnMode(requested, normalized) {
  if (requested && requested !== normalized) {
    console.warn(`提示：spawn --mode ${requested} 已进入兼容期，本次按 ${normalized} 项目工作台处理。`);
  }
}

function getSpawnModeConfig(mode, language = "zh") {
  const base = SPAWN_MODES[mode];
  if (!base) return null;
  return {
    ...base,
    language,
    ...(SPAWN_MODE_LANGUAGE_OVERRIDES[language]?.[mode] || {})
  };
}

function applySpawnBlueprintModeConfig(modeConfig, blueprint) {
  if (!blueprint) return modeConfig;
  return {
    ...modeConfig,
    formalSource: blueprint.paths?.formal_source || modeConfig.formalSource,
    businessWorkArea: blueprint.paths?.business_work_area || modeConfig.businessWorkArea
  };
}

function buildSpawnPlan({ hubRoot, hubState, targetDir, projectName, projectId, status, mode, language, modeConfig, blueprint }) {
  const kitDir = path.join(PRODUCT_ROOT, "core", "kits", modeConfig.kit);
  if (!fs.existsSync(kitDir)) {
    throw new Error(`找不到 Kit：${modeConfig.kit}`);
  }

  const hubPaths = getHubPaths(hubState);
  const satellitePaths = getSatellitePaths(language);
  const registryPath = path.join(hubRoot, hubPaths.projectRegistry);
  const registry = readProjectRegistry(registryPath);
  const targetPath = path.resolve(targetDir);
  ensureProjectCanBeRegistered(registry, projectId, targetPath);

  const now = new Date().toISOString();
  const actions = [];
  const defaultPack = loadPack("general", language);
  const packVariables = {
    workspace: {
      name: projectName,
      type: modeConfig.workspaceType
    },
    pack: defaultPack,
    paths: defaultPack.paths || {},
    overrides: defaultPack.overrides || {}
  };
  const packRuleSlots = renderPackRuleSlots(defaultPack, packVariables, "场景规则");

  for (const source of walkFiles(kitDir)) {
    const sourceRelativePath = normalizeRelativePath(path.relative(kitDir, source));
    if (shouldSpawnOverrideKitFile(sourceRelativePath)) continue;
    const relativePath = mapKitRelativePathForLanguage(sourceRelativePath, language);
    let content = fs.readFileSync(source, "utf8");
    content = renderSatelliteKitContent(relativePath, content, { language, mode, modeConfig });
    if (normalizeRelativePath(relativePath) === "AGENTS.md") {
      content = ensureBlueprintRulesIndexReference(content, blueprint);
      if (packRuleSlots.length) {
        content = ensureRulesIndexReference(content);
      }
    }
    actions.push(fileAction(targetDir, relativePath, content));
  }
  for (const rolePath of Object.values(defaultPack.paths || {})) {
    actions.push(directoryAction(targetDir, rolePath));
  }
  actions.push(...buildPackDirectoryActions(targetDir, defaultPack, packVariables));
  actions.push(...buildRuleSlotActions(targetDir, packRuleSlots));
  actions.push(fileAction(targetDir, path.join(satellitePaths.mainRepoSync, "README.md"), renderSatelliteMainRepoSyncReadme(language)));
  actions.push(fileAction(targetDir, path.join(satellitePaths.identity, "README.md"), renderSatelliteIdentityReadme(language)));
  actions.push(fileAction(targetDir, path.join(satellitePaths.lessons, "README.md"), renderSatelliteLessonsReadme(language)));

  if (blueprint) {
    for (const folder of blueprint.folders || []) {
      actions.push(directoryAction(targetDir, normalizeSafeRelativePath(folder, "blueprint.folders")));
    }
    actions.push(directoryAction(targetDir, normalizeSafeRelativePath(modeConfig.formalSource, "paths.formal_source")));
    actions.push(directoryAction(targetDir, normalizeSafeRelativePath(modeConfig.businessWorkArea, "paths.business_work_area")));
    actions.push(...buildBlueprintSeedActions(targetDir, blueprint, {
      projectName,
      projectId,
      mode,
      modeConfig,
      language
    }));
    actions.push(...buildBlueprintRuleSlotActions(targetDir, blueprint, {
      projectName,
      projectId,
      mode,
      modeConfig,
      language
    }));
  }

  actions.push(...copyDirectoryFiles(hubRoot, hubPaths.identity, targetDir, satellitePaths.identity));
  actions.push(...copyDirectoryFiles(hubRoot, hubPaths.lessons, targetDir, satellitePaths.lessons));
  if (fs.existsSync(path.join(hubRoot, ".internal"))) {
    actions.push(...copyDirectoryFiles(hubRoot, ".internal", targetDir, path.join(".starwork", "internal")));
  }
  if (fs.existsSync(path.join(hubRoot, ".obsidian"))) {
    actions.push(...copyDirectoryFiles(hubRoot, ".obsidian", targetDir, ".obsidian"));
  }

  actions.push(directoryAction(targetDir, path.join(".agents", "skills")));
  actions.push(directoryAction(targetDir, path.join(".claude", "skills")));
  const skillPlan = buildSpawnSkillPlan({
    hubRoot,
    hubPaths,
    targetDir,
    blueprint,
    kit: modeConfig.kit,
    language,
    installedBy: blueprint ? "starwork spawn --blueprint" : "starwork spawn"
  });
  actions.push(...skillPlan.actions);

  const workspaceState = {
    schema: "starwork.workspace.v0.1",
    core: "0.1",
    workspace_type: modeConfig.workspaceType,
    kit: modeConfig.kit,
    packs: [
      {
        id: defaultPack.id,
        version: defaultPack.version || "0.1.0",
        paths: defaultPack.paths || {},
        installed_at: now
      }
    ],
    language,
    paths: {
      formal_source: modeConfig.formalSource,
      business_work_area: modeConfig.businessWorkArea
    },
    ...(blueprint ? {
      customization: {
        type: "spawn_blueprint",
        schema: blueprint.schema,
        source: path.basename(blueprint.__path),
        folders: (blueprint.folders || []).map((folder) => normalizeSafeRelativePath(folder, "blueprint.folders")),
        agent_rules: (blueprint.agent_rules || []).map((rule) => ({
          slot: rule.slot,
          from: normalizeSafeRelativePath(rule.from, "blueprint.agent_rules.from")
        })),
        seed: (blueprint.seed || []).map((seed) => ({
          from: normalizeSafeRelativePath(seed.from, "blueprint.seed.from"),
          to: normalizeSafeRelativePath(seed.to, "blueprint.seed.to")
        }))
      }
    } : {}),
    project_center: {
      path: hubRoot,
      project_id: projectId
    },
    hub: {
      path: hubRoot,
      project_id: projectId
    },
    created_by: blueprint ? "starwork spawn --blueprint" : "starwork spawn"
  };

  const coreSync = {
    schema: "starwork.core_sync.v0.1",
    hub_path: hubRoot,
    project_id: projectId,
    project_name: projectName,
    core: "0.1",
    mode,
    created_at: now,
    last_sync_at: now,
    resources: {
      identity: {
        source: hubPaths.identity,
        target: satellitePaths.identity,
        mode: "snapshot"
      },
      lessons: {
        source: hubPaths.lessons,
        target: satellitePaths.lessons,
        mode: "snapshot"
      },
      skills: {
        source: "skills/registry.json",
        target: [".agents/skills/", ".claude/skills/"],
        mode: "selected",
        items: skillPlan.records.map((record) => ({
          id: record.id,
          distribution: record.distribution,
          mounts: record.mounts
        }))
      }
    }
  };
  const runtimeSync = {
    ...coreSync,
    schema: "starwork.sync.v0.1",
    legacy_mirror: ".core-sync.json"
  };
  const legacyCoreSync = {
    ...coreSync,
    legacy_of: ".starwork/sync.json"
  };

  actions.push(fileAction(targetDir, path.join(".starwork", "workspace.json"), `${JSON.stringify(workspaceState, null, 2)}\n`));
  actions.push(fileAction(targetDir, path.join(".starwork", "skills.json"), renderProjectSkillsManifest(skillPlan.records)));
  actions.push(fileAction(targetDir, path.join(".starwork", "sync.json"), `${JSON.stringify(runtimeSync, null, 2)}\n`));
  actions.push(fileAction(targetDir, ".core-sync.json", `${JSON.stringify(legacyCoreSync, null, 2)}\n`));
  actions.push(fileAction(targetDir, satellitePaths.projectStatus, renderSpawnProjectStatus({
    projectName,
    projectId,
    hubRoot,
    mode,
    language,
    modeConfig,
    blueprint
  })));

  const nextRegistry = {
    ...registry,
    schema: registry.schema || "starwork.projects.registry.v0.1",
    projects: [
      ...(Array.isArray(registry.projects) ? registry.projects : []),
      {
        id: projectId,
        name: projectName,
        path: targetPath,
        status,
        core: "0.1",
        kit: modeConfig.kit,
        mode,
        customized: Boolean(blueprint),
        created_at: now,
        last_sync_at: now,
        sync: {
          identity: "snapshot",
          lessons: "snapshot",
          skills: "selected"
        }
      }
    ]
  };
  actions.push(overwriteFileAction(hubRoot, hubPaths.projectRegistry, `${JSON.stringify(nextRegistry, null, 2)}\n`));

  return {
    hubRoot,
    targetDir,
    projectName,
    projectId,
    status,
    mode,
    language,
    modeLabel: modeConfig.label,
    kit: modeConfig.kit,
    blueprint,
    skills: skillPlan.records,
    actions: dedupeActions(actions)
  };
}

function shouldSpawnOverrideKitFile(relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  return normalized === ".core-sync.json"
    || normalized === "_系统/上下文/当前项目.md"
    || normalized.startsWith("_系统/身份/")
    || normalized.startsWith("_系统/教训/")
    || normalized.startsWith("知识/");
}

function getSatellitePaths(language = "zh") {
  if (language === "en") {
    return {
      projectStatus: "_system/context/current-project.md",
      currentWork: "_system/tasks/current-work.md",
      identity: "_system/identity",
      lessons: "_system/lessons",
      mainRepoSync: "_system/main-repo-sync",
      knowledge: "knowledge",
      references: "references",
      outputDrafts: "outputs/drafts",
      outputFinal: "outputs/final"
    };
  }
  return {
    projectStatus: "_系统/上下文/当前项目.md",
    currentWork: "_系统/任务/当前工作.md",
    identity: "_系统/身份",
    lessons: "_系统/教训",
    mainRepoSync: "_系统/主库同步",
    knowledge: "知识",
    references: "参考资料",
    outputDrafts: "输出/草稿",
    outputFinal: "输出/确认成果"
  };
}

function mapKitRelativePathForWorkspace(relativePath, kit, language = "zh") {
  const normalized = normalizeRelativePath(relativePath);
  if (kit === "project" || kit?.startsWith("satellite-")) {
    return mapKitRelativePathForLanguage(normalized, language);
  }
  if (kit === "hub") {
    return mapHubRelativePathForLanguage(normalized, language);
  }
  return normalized;
}

function mapHubRelativePathForLanguage(relativePath, language = "zh") {
  const normalized = normalizeRelativePath(relativePath);
  if (language !== "zh") return normalized;
  if (normalized.startsWith(".incoming/")) return normalized;
  return normalized
    .split("/")
    .map((segment) => ({
      identity: "身份",
      lessons: "教训",
      knowledge: "知识",
      projects: "项目",
      coordination: "协作",
      skills: "技能",
      workspace: "工作区"
    })[segment] || segment)
    .join("/");
}

function mapKitRelativePathForLanguage(relativePath, language = "zh") {
  const normalized = normalizeRelativePath(relativePath);
  if (language !== "en") return normalized;
  return normalized
    .split("/")
    .map((segment) => ({
      "_系统": "_system",
      "上下文": "context",
      "任务": "tasks",
      "身份": "identity",
      "教训": "lessons",
      "主库同步": "main-repo-sync",
      "当前项目.md": "current-project.md",
      "决策.md": "decisions.md",
      "当前工作.md": "current-work.md",
      "知识": "knowledge",
      "参考资料": "references",
      "输出": "outputs",
      "草稿": "drafts",
      "确认成果": "final"
    })[segment] || segment)
    .join("/");
}

function renderSatelliteKitContent(relativePath, content, { language, mode, modeConfig }) {
  const normalized = normalizeRelativePath(relativePath);
  if (normalized === "AGENTS.md") {
    return language === "en" ? renderEnglishSatelliteAgents(mode) : renderChineseSatelliteAgents();
  }
  if (normalized === "README.md") {
    return language === "en" ? renderEnglishSatelliteReadme(mode, modeConfig) : renderChineseSatelliteReadme(modeConfig);
  }
  if (language !== "en") return content;
  if (normalized === "knowledge/README.md") {
    return "# Knowledge\n\nThis path should be a read-only link to the Project Center `knowledge/` directory.\n\nDo not edit shared knowledge directly inside this project workspace. Submit reusable knowledge candidates through the Project Center review flow.\n";
  }
  if (normalized === "references/README.md") {
    return "# References\n\nStore source materials and reference files for this project here.\n";
  }
  if (normalized === "outputs/drafts/README.md") {
    return "# Drafts\n\nStore AI drafts and working drafts here.\n";
  }
  if (normalized === "outputs/final/README.md") {
    return "# Final Outputs\n\nStore user-approved outputs and confirmed deliverables here, unless this project declares another formal source of truth.\n";
  }
  if (normalized === "_system/tasks/current-work.md") {
    return renderEnglishCurrentWorkTemplate();
  }
  if (normalized === "_system/context/decisions.md") {
    return "# Decisions\n\nOnly record high-impact decisions that change project direction, structure, ownership, or irreversible commitments.\n";
  }
  return content;
}

function renderProjectKitContent(relativePath, content, { language }) {
  if (language !== "en") return content;
  const normalized = normalizeRelativePath(relativePath);
  if (normalized === "AGENTS.md") {
    return renderEnglishProjectAgents();
  }
  if (normalized === "README.md") {
    return renderEnglishProjectReadme();
  }
  if (normalized === "_system/context/current-project.md") {
    return renderEnglishCurrentProjectTemplate();
  }
  if (normalized === "_system/tasks/current-work.md") {
    return renderEnglishCurrentWorkTemplate();
  }
  if (normalized === "_system/identity/README.md") {
    return renderEnglishProjectIdentityReadme();
  }
  if (normalized === "_system/lessons/README.md") {
    return renderEnglishProjectLessonsReadme();
  }
  return content;
}

function renderHubKitContent(relativePath, content, { language }) {
  const normalized = normalizeRelativePath(relativePath);
  if (language === "en") {
    if (normalized === "AGENTS.md") return renderEnglishHubAgents();
    if (normalized === "README.md") return renderEnglishHubReadme();
    if (normalized === "identity/README.md") return "# Identity\n\nThis is the Project Center source for cross-project identity, preferences, and durable context.\n\nDo not write temporary project preferences here. Put reusable candidates through `.incoming/identity/` first.\n";
    if (normalized === "lessons/README.md") return "# Lessons\n\nThis is the Project Center source for reusable lessons across projects.\n\nDo not record ordinary project progress here. Put reusable candidates through `.incoming/lessons/` first.\n";
    if (normalized === "knowledge/README.md") return "# Knowledge\n\nThis is the Project Center source for shared cross-project knowledge.\n\nManaged project workspaces should treat this as read-only by default. Put reusable knowledge candidates through `.incoming/knowledge/` first.\n";
    if (normalized === "projects/README.md") return "# Projects\n\nThis directory records the Project Center project list and cross-project coordination layer.\n";
    if (normalized === "projects/coordination/README.md") return "# Coordination\n\nUse this directory for central cross-project coordination.\n\n`messages/` records queued, delivered, acknowledged, and closed states. The Project Center local inbox and outbox live in `.starwork/handoff/`.\n";
    if (normalized === "skills/README.md") return "# Skills\n\nThis directory stores Project Center managed skills.\n\n`registry.json` is the list used by `starwork spawn` when distributing selected skills to project workspaces.\n";
    if (normalized === "workspace/README.md") return "# Workspace\n\nThis is the Project Center area for drafts, experiments, and general capability development.\n\nMove mature assets into `skills/`, `lessons/`, `identity/`, or `knowledge/` only after review.\n";
    if (normalized === ".incoming/README.md") return "# Incoming\n\nThis hidden queue stores candidates proposed by managed projects before they are reviewed and merged into shared Project Center assets.\n";
    return content;
  }
  if (normalized === "AGENTS.md") return renderChineseHubAgents();
  if (normalized === "README.md") return renderChineseHubReadme();
  return content;
}

function renderChineseHubAgents() {
  return `# StarWork 项目中心规则

## 开始前先读

1. \`项目/registry.json\`
2. \`项目/协作/README.md\`
3. \`技能/registry.json\`
4. \`.incoming/\`
5. \`工作区/README.md\`

## 项目中心职责

- 维护跨项目共享身份、教训、知识和正式技能。
- 维护项目注册表和跨项目联络中央路由。
- 审核中心管理项目工作台的回写候选。
- 在 \`工作区/\` 中开发通用规则草稿、实验和技能原型。

## 写入边界

- 项目注册信息写入 \`项目/registry.json\`。
- 跨项目中央路由写入 \`项目/协作/\`。
- 项目中心自己的本地收发队列写入 \`.starwork/handoff/\`。
- 候选共享内容先写入 \`.incoming/\`，审核后再合并。
- 草稿、实验和未定稿通用能力只能先写入 \`工作区/\`。
- 正式共享资产写入 \`身份/\`、\`教训/\`、\`知识/\`、\`技能/\`。
- 具体项目的进度正文留在各自项目工作台内，不复制进项目中心。

## 需要确认

- 修改身份、教训、共享知识或正式技能。
- 合并 \`.incoming/\` 中的候选内容。
- 创建、暂停或归档项目注册。
`;
}

function renderChineseHubReadme() {
  return `# 项目中心

适合希望统一管理多个项目工作台的用户。项目中心是共享资产、项目注册、跨项目路由、回写审核和通用能力草稿的管理层，不是具体项目工作台。

## 包含

- \`AGENTS.md\`
- \`.starwork/workspace.json\`
- \`.starwork/skills.json\`
- \`.starwork/handoff/\`
- \`.internal/\`
- \`.incoming/\`
- \`项目/registry.json\`
- \`项目/协作/\`
- \`身份/\`
- \`教训/\`
- \`知识/\`
- \`技能/\`
- \`工作区/\`

隐藏机制目录保持英文。用户可见目录使用中文，避免同一个项目中心里同时出现中英文同义目录。

从项目中心创建项目工作台应由 \`starwork spawn\` 完成。
`;
}

function renderEnglishHubAgents() {
  return `# StarWork Project Center Rules

## Read First

1. \`projects/registry.json\`
2. \`projects/coordination/README.md\`
3. \`skills/registry.json\`
4. \`.incoming/\`
5. \`workspace/README.md\`

## Project Center Responsibilities

- Maintain shared identity, lessons, knowledge, and formal skills.
- Maintain the project registry and central cross-project coordination route.
- Review write-back candidates from managed project workspaces.
- Use \`workspace/\` for general rule drafts, experiments, and skill prototypes.

## Write Boundaries

- Project registration belongs in \`projects/registry.json\`.
- Central cross-project coordination belongs in \`projects/coordination/\`.
- The Project Center local inbox and outbox live in \`.starwork/handoff/\`.
- Shared candidates go to \`.incoming/\` before review and merge.
- Drafts and experiments go to \`workspace/\`.
- Formal shared assets belong in \`identity/\`, \`lessons/\`, \`knowledge/\`, and \`skills/\`.
- Detailed project progress stays inside each project workspace.

## Confirmation Required

- Changing identity, lessons, shared knowledge, or formal skills.
- Merging candidates from \`.incoming/\`.
- Creating, pausing, or archiving project registrations.
`;
}

function renderEnglishHubReadme() {
  return `# Project Center

The Project Center manages shared assets, project registration, cross-project routing, write-back review, and general capability drafts. It is not a concrete project workspace.

## Includes

- \`AGENTS.md\`
- \`.starwork/workspace.json\`
- \`.starwork/skills.json\`
- \`.starwork/handoff/\`
- \`.internal/\`
- \`.incoming/\`
- \`projects/registry.json\`
- \`projects/coordination/\`
- \`identity/\`
- \`lessons/\`
- \`knowledge/\`
- \`skills/\`
- \`workspace/\`

Hidden mechanism directories stay in English. User-visible directories follow the workspace language and should not duplicate the same meaning in two languages.

Use \`starwork spawn\` to create managed project workspaces from this Project Center.
`;
}

function renderEnglishProjectAgents() {
  return `# Workspace Rules

## Read First

1. \`_system/context/current-project.md\`
2. \`_system/tasks/current-work.md\`
3. \`.starwork/rules/index.md\` when it exists

## Read When Relevant

- Read \`_system/identity/README.md\` when user preferences, communication style, domain background, or long-term context may matter.
- Read \`_system/lessons/README.md\` before repeated, risky, or pattern-sensitive work.
- If this project has a knowledge base enabled and long-term project knowledge matters, read the knowledge base rules and index.
- Read Project Center sync docs only if this workspace is connected to a Project Center.

## File Boundaries

- Project status belongs in \`_system/context/current-project.md\`.
- Current execution notes belong in \`_system/tasks/current-work.md\`.
- User preferences, communication style, and durable background belong in \`_system/identity/README.md\`.
- Reusable lessons that should change future behavior belong in \`_system/lessons/README.md\`.
- The project knowledge base is optional. Enable it with \`starwork knowledge init\` when the project needs long-term knowledge.
- Concrete business directories are defined by installed Packs or user customizations.
- Source materials, drafts, and approved outputs follow Pack rules or the path mapping in \`.starwork/workspace.json\`.
- StarWork mechanism state belongs in \`.starwork/\`.

## Workflow

- Keep project facts separate from command output and temporary explanations.
- Do not create overlapping top-level folders unless the user confirms the purpose.
- If \`.starwork/rules/\` contains extra rules, read the index and follow those rules without treating them as progress notes.

## Confirmation Required

- Changing identity or stable preferences.
- Promoting candidate lessons into stable lessons.
- Promoting drafts into the formal source of truth.
- Changing workspace structure or top-level business folders.
`;
}

function renderEnglishProjectReadme() {
  return `# StarWork Project Workspace

This is a project workspace for concrete work. It can be used independently. If a Project Center creates it later, \`starwork spawn\` adds Project Center sync files separately.

## Main Paths

- \`_system/context/current-project.md\`: project status
- \`_system/tasks/current-work.md\`: current work
- \`_system/identity/\`: durable user and project context
- \`_system/lessons/\`: reusable lessons

Concrete business directories are created by Packs or user customizations. The default General Work Pack creates \`references/\`, \`outputs/drafts/\`, and \`outputs/final/\`; they are not part of the base Project Kit.

When the project needs long-term knowledge maintained by AI, run \`starwork knowledge init\` to enable \`knowledge-base/\`.

## Not Included By Default

- \`_system/main-repo-sync/\`
- \`.core-sync.json\`
- \`.internal/\`
`;
}

function renderEnglishCurrentProjectTemplate() {
  return `# Current Project

## Goal

TBD.

## Current Stage

TBD.

## Focus

- TBD.

## Primary Sources

- TBD.

## Risks

- TBD.

## Next Step

- TBD.
`;
}

function renderEnglishCurrentWorkTemplate() {
  return `# Current Work

## Now

- TBD.

## Next

- TBD.

## Waiting On

- TBD.

## Notes For Next AI

- TBD.
`;
}

function renderEnglishProjectIdentityReadme() {
  return `# Identity

## Durable Context

- Project owner / user:
- Working style:
- Domain background:
- Long-lived preferences:

## Communication Preferences

- Preferred language:
- Tone:
- Detail level:

## Stable Constraints

- Do:
- Avoid:

## Update Rule

Read this file when user preference, domain background, or long-term context matters.
Ask before changing stable identity or preferences.
`;
}

function renderEnglishProjectLessonsReadme() {
  return `# Lessons

Record reusable lessons that should change future behavior.

## Active Lessons

- TBD.

## Candidate Lessons

- TBD.

## How To Add A Lesson

A good lesson should be specific, reusable, and behavior-changing.
Do not record ordinary progress summaries here.
Ask before promoting a candidate lesson into a stable lesson.
`;
}

function renderEnglishSatelliteAgents(mode) {
  return `# StarWork Workspace Rules

## Read First

1. \`_system/context/current-project.md\`
2. \`_system/tasks/current-work.md\`
3. \`.starwork/rules/index.md\` when it exists

## Read When Relevant

- Read \`_system/identity/README.md\` when user preferences, communication style, domain background, or long-term context may matter.
- Read \`_system/lessons/README.md\` before repeated, risky, or pattern-sensitive work.
- Read \`_system/main-repo-sync/README.md\` only when shared Project Center resources, skills, or cross-project coordination are involved.

## Write Boundaries

- Project status belongs in \`_system/context/current-project.md\`.
- Current work belongs in \`_system/tasks/current-work.md\`.
- Identity belongs in \`_system/identity/\` and is read-only by default.
- Lessons belong in \`_system/lessons/\`.
- Concrete business directories come from the installed Pack and \`.starwork/workspace.json\`.
- Source materials, drafts, and approved outputs follow Pack rules.
- Local cross-project inbox, outbox, sent, and archived records live in \`.starwork/handoff/\`.
- Project Center central routing lives in \`projects/coordination/\`.

## Workflow

- Keep project facts separate from command output and temporary explanations.
- Use handoff records for Project Center communication; do not write project progress into the Project Center registry.

## Confirmation Required

- Changing identity, lessons, shared knowledge, or Project Center sync content.
- Promoting drafts into the formal source of truth.
`;
}

function renderChineseSatelliteAgents() {
  return `# StarWork 工作区规则

## 开始前先读

1. \`_系统/上下文/当前项目.md\`
2. \`_系统/任务/当前工作.md\`
3. 如果存在 \`.starwork/rules/index.md\`，再按索引读取扩展规则

## 相关时再读

- 涉及用户偏好、沟通方式、领域背景或长期上下文时，读 \`_系统/身份/README.md\`
- 做重复性、风险较高或容易踩坑的工作前，读 \`_系统/教训/README.md\`
- 只有涉及项目中心资源、共享 skill 或跨项目协同时，才读 \`_系统/主库同步/README.md\`

## 文件边界

- 项目状态写入 \`_系统/上下文/当前项目.md\`
- 当前执行记录写入 \`_系统/任务/当前工作.md\`
- 身份和长期偏好默认来自项目中心快照，放在 \`_系统/身份/\`
- 可复用教训默认来自项目中心快照，项目候选教训放在 \`_系统/教训/\`
- 具体业务目录由已安装 Pack 和 \`.starwork/workspace.json\` 决定
- 原始资料、AI 草稿和确认成果按 Pack 规则处理
- 跨项目联络的本地收发记录放入 \`.starwork/handoff/\`

## 工作方式

- 项目进度留在本项目，不写进项目中心登记表
- 与项目中心沟通通过联络和回写流程处理，不直接改写项目中心正式资源
- 不把命令执行结果、临时解释或初始化记录写入项目事实源

## 需要确认

- 修改身份、教训、共享知识或项目中心同步内容
- 将草稿晋升为正式事实源
- 改变工作台结构或顶层业务目录
`;
}

function renderEnglishSatelliteReadme(mode, modeConfig) {
  return `# StarWork Project Workspace

This project workspace was created from and registered in a Project Center.

## Includes

- \`_system/context/current-project.md\`
- \`_system/tasks/current-work.md\`
- \`_system/main-repo-sync/\`
- \`.starwork/handoff/\`
- General Pack business directories such as \`references/\` and \`outputs/\`
When connected to a Project Center, shared identity, lessons, skills, and project registration come from the Project Center. This project keeps its own work, drafts, confirmed outputs, and optional local knowledge base.
`;
}

function renderChineseSatelliteReadme(modeConfig) {
  return `# StarWork 项目工作台

这是由项目中心创建和登记的具体项目工作台。项目中心提供共享身份、教训和部分 skills；项目自己的状态、资料、草稿、确认成果和可选本地知识库仍留在本项目。

## 主要路径

- \`_系统/上下文/当前项目.md\`：项目状态
- \`_系统/任务/当前工作.md\`：当前工作
- \`_系统/主库同步/\`：本项目与项目中心的关系说明
- \`_系统/身份/\`：来自项目中心的身份快照和项目候选更新
- \`_系统/教训/\`：来自项目中心的教训快照和项目候选教训
- General Pack 创建的 \`参考资料/\` 和 \`输出/\` 等业务目录

正式成果默认放在 \`${modeConfig.formalSource}\`，当前工作资料默认放在 \`${modeConfig.businessWorkArea}\`。
`;
}

function renderSatelliteMainRepoSyncReadme(language) {
  if (language !== "en") {
    return `# 项目中心同步

这里说明本项目工作台与项目中心的关系。

项目中心不是本项目的上级工作文件夹，也不承载本项目的进度正文。本项目自己的状态、当前工作、资料、草稿和确认成果都留在本项目内。

| 本地路径 | 来源 | 规则 |
|---|---|---|
| \`_系统/身份/\` | 项目中心 \`身份/\` | 默认只读；修改稳定身份前需要确认。 |
| \`_系统/教训/\` | 项目中心 \`教训/\` | 项目候选教训可先留在本项目，确认后再提交项目中心审核。 |
| \`.starwork/internal/\` | 项目中心内部协议 | 稳定协议快照。 |
| \`.agents/skills/\` 和 \`.claude/skills/\` | 项目中心或工作台自带技能 | 只挂载本项目需要的部分。 |
| \`.starwork/handoff/\` | 本项目 | 跨项目联络的本地收发队列。 |
`;
  }
  return `# Project Center Sync

This folder explains the relationship between this project workspace and its Project Center.

The Project Center is not a parent work folder and should not receive project progress bodies. This project keeps its own status, current work, references, drafts, and final outputs.

| Local path | Source | Rule |
|---|---|---|
| \`_system/identity/\` | Project Center \`identity/\` | Read-only by default. |
| \`_system/lessons/\` | Project Center \`lessons/\` | Project candidates may be reviewed before Project Center merge. |
| \`.internal/\` | Project Center internal protocols | Stable protocol snapshot. |
| \`.agents/skills/\` and \`.claude/skills/\` | Project Center or bundled skills | Selected mounts only. |
| \`.starwork/handoff/\` | This project | Local cross-project inbox and outbox. |
`;
}

function renderSatelliteIdentityReadme(language) {
  if (language !== "en") {
    return `# 身份

这里放置来自项目中心的身份、偏好和长期上下文快照，也可以暂存本项目发现的候选更新。

默认先按只读处理。需要修改稳定身份或偏好时，先确认，再通过项目中心回写或审核流程处理。
`;
  }
  return `# Identity

This folder contains Project Center identity snapshots and project-local identity candidates.

Treat Project Center identity as read-only by default. Ask before changing stable identity or preferences, then route confirmed updates through the Project Center review flow.
`;
}

function renderSatelliteLessonsReadme(language) {
  if (language !== "en") {
    return `# 教训

这里放置来自项目中心的跨项目教训快照，也可以暂存本项目发现的候选教训。

不要记录普通进度摘要。确认具有复用价值后，再通过项目中心回写或审核流程处理。
`;
  }
  return `# Lessons

This folder contains Project Center lesson snapshots and project-local lesson candidates.

Do not record ordinary progress summaries here. Route reusable, behavior-changing lessons through the Project Center review flow after confirmation.
`;
}

function ensureBlueprintRulesIndexReference(content, blueprint) {
  if (!blueprint || !blueprint.agent_rules?.length) return content;
  return ensureRulesIndexReference(content);
}

function buildBlueprintRuleSlotActions(targetDir, blueprint, variables) {
  if (!blueprint || !blueprint.agent_rules?.length) return [];
  const slots = [];
  for (const rule of blueprint.agent_rules) {
    const source = normalizeSafeSourcePath(rule.from, blueprint.__dir, "blueprint.agent_rules.from");
    const ruleContent = renderText(fs.readFileSync(source, "utf8"), buildBlueprintVariables(blueprint, variables)).trim();
    if (!ruleContent) continue;
    slots.push({ slot: rule.slot, content: ruleContent, group: "项目定制规则" });
  }
  return buildRuleSlotActions(targetDir, slots);
}

function buildBlueprintSeedActions(targetDir, blueprint, variables) {
  const actions = [];
  for (const seed of blueprint.seed || []) {
    const source = normalizeSafeSourcePath(seed.from, blueprint.__dir, "blueprint.seed.from");
    const target = normalizeSafeRelativePath(seed.to, "blueprint.seed.to");
    const content = renderText(fs.readFileSync(source, "utf8"), buildBlueprintVariables(blueprint, variables));
    const targetPath = path.join(targetDir, target);
    const conflict = seed.on_conflict || "error";
    if (fs.existsSync(targetPath)) {
      if (conflict === "skip") continue;
      if (conflict === "create_new") {
        const alternate = nextAvailableSibling(targetPath);
        actions.push({ type: "file", mode: "create-new", target: alternate, originalTarget: targetPath, relativePath: path.relative(targetDir, alternate), content });
        continue;
      }
      throw new Error(`blueprint seed 目标已存在：${target}`);
    }
    actions.push(fileAction(targetDir, target, content));
  }
  return actions;
}

function buildBlueprintVariables(blueprint, { projectName, projectId, mode, modeConfig }) {
  return {
    blueprint,
    workspace: {
      name: projectName,
      type: modeConfig.workspaceType
    },
    project: {
      id: projectId,
      name: projectName
    },
    spawn: {
      mode
    },
    paths: {
      formal_source: modeConfig.formalSource,
      business_work_area: modeConfig.businessWorkArea
    }
  };
}

function copyDirectoryFiles(sourceRoot, sourceRelativeDir, targetRoot, targetRelativeDir, options = {}) {
  const sourceDir = path.join(sourceRoot, sourceRelativeDir);
  if (!fs.existsSync(sourceDir)) return [];
  return walkFiles(sourceDir).map((source) => {
    const relativePath = path.relative(sourceDir, source);
    const targetRelativePath = path.join(targetRelativeDir, relativePath);
    const content = fs.readFileSync(source, "utf8");
    return options.idempotent
      ? idempotentFileAction(targetRoot, targetRelativePath, content)
      : fileAction(targetRoot, targetRelativePath, content);
  });
}

function readProjectRegistry(registryPath) {
  try {
    const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    if (!Array.isArray(registry.projects)) {
      throw new Error("projects 必须是数组");
    }
    return registry;
  } catch (error) {
    throw new Error(`无法读取项目中心项目注册表：${error.message}`);
  }
}

function readProjectRegistryTolerant(registryPath) {
  try {
    return { ok: true, registry: readProjectRegistry(registryPath) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function getRegistryProjectId(project) {
  return project?.id || project?.project_id || null;
}

function findDuplicateProjectIds(projects) {
  const seen = new Set();
  const duplicates = new Set();
  for (const project of projects) {
    const id = getRegistryProjectId(project);
    if (!id) continue;
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return [...duplicates];
}

function auditAddCheck(result, id, level, message, trace) {
  result.checks.push({ id, level, message, ...(trace ? { trace } : {}) });
  if (result.summary?.[level] != null) result.summary[level] += 1;
}

function auditAddProjectCheck(project, id, level, message, trace) {
  project.checks.push({ id, level, message, ...(trace ? { trace } : {}) });
}

function finalizeAuditResult(result, options = {}) {
  result.ok = result.summary.fail === 0 && result.projects.every((project) => !project.checks.some((check) => check.level === "fail"));
  result.strict_ok = result.ok && (options.strict ? result.summary.warn === 0 && result.projects.every((project) => !project.checks.some((check) => check.level === "warn")) : true);
  result.exitCode = result.strict_ok ? 0 : 1;
  return result;
}

function auditPublicResult(result) {
  return {
    schema: result.schema,
    ok: result.ok,
    strict_ok: result.strict_ok,
    hub: result.hub,
    registry: result.registry,
    summary: result.summary,
    projects: result.projects,
    checks: result.checks
  };
}

function printAuditResult(result) {
  console.log("");
  console.log("StarWork 项目中心巡检结果");
  console.log("");
  console.log(`项目中心目录：${result.hub.path}`);
  console.log("");
  console.log("巡检概览：");
  console.log(`- 项目中心自身：${result.hub.ok ? "通过" : "需要处理"}`);
  console.log(`- 项目登记表：${result.registry.ok ? "可读取" : "需要处理"}${result.registry.path ? `（${result.registry.path}）` : ""}`);
  console.log(`- 已登记项目：${result.summary.projects_total} 个`);
  console.log(`- 本次检查项目：${result.summary.projects_checked} 个`);
  console.log(`- 可访问项目：${result.summary.projects_reachable} 个`);
  console.log(`- 提醒：${result.summary.info + result.summary.warn} 项`);
  console.log(`- 需要处理：${result.summary.fail} 项`);
  console.log("");

  const hubProblems = result.checks.filter((check) => check.level !== "pass" && check.id.startsWith("hub."));
  const registryProblems = result.checks.filter((check) => check.level !== "pass" && check.id.startsWith("registry."));
  if (hubProblems.length) {
    console.log("项目中心自身问题：");
    hubProblems.forEach((check) => console.log(`- ${friendlyCheckLevel(check.level)}：${friendlyAuditMessage(check.message)}${check.trace ? `（${check.trace}）` : ""}`));
    console.log("");
  }
  if (registryProblems.length) {
    console.log("项目登记表问题：");
    registryProblems.forEach((check) => console.log(`- ${friendlyCheckLevel(check.level)}：${friendlyAuditMessage(check.message)}${check.trace ? `（${check.trace}）` : ""}`));
    console.log("");
  }

  if (result.projects.length) {
    console.log("项目检查结果：");
    for (const project of result.projects) {
      const fails = project.checks.filter((check) => check.level === "fail").length;
      const warns = project.checks.filter((check) => check.level === "warn").length;
      const label = fails ? "需要处理" : warns ? "有提醒" : "通过";
      console.log(`- ${label}：${project.project_id || "(缺少项目 ID)"}${project.path ? `（${project.path}）` : ""}`);
      const visible = project.checks.filter((check) => check.level !== "pass");
      visible.slice(0, 5).forEach((check) => console.log(`  - ${friendlyCheckLevel(check.level)}：${friendlyAuditMessage(check.message)}${check.trace ? `（${check.trace}）` : ""}`));
      if (visible.length > 5) console.log(`  - 另有 ${visible.length - 5} 项提醒或问题`);
    }
    console.log("");
  }

  console.log("");
  console.log("结论：");
  console.log(result.ok ? "这个项目中心和已登记项目目前结构完整，可以继续使用。" : "这个项目中心或部分项目存在需要处理的问题。可把 JSON 结果交给 starworkAudit 生成保守修复方案。");
}

function friendlyAuditMessage(message) {
  return String(message || "")
    .replace(/Project Center workspace state is valid/g, "项目中心工作台身份证有效")
    .replace(/Project Center doctor passed/g, "项目中心结构检查通过")
    .replace(/Project Center doctor has blocking issues/g, "项目中心结构检查有阻塞问题")
    .replace(/No duplicate project ids/g, "项目 ID 没有重复")
    .replace(/Project workspace path exists/g, "项目目录存在")
    .replace(/Project has Project Center connection/g, "项目已经加入项目中心")
    .replace(/Project Center project id matches registry/g, "项目 ID 和登记表一致")
    .replace(/Project Center path matches/g, "项目中心路径一致")
    .replace(/Project workspace doctor passed/g, "项目结构检查通过")
    .replace(/Project workspace doctor has blocking issues/g, "项目结构检查有阻塞问题")
    .replace(/Hub/g, "项目中心")
    .replace(/workspace state/g, "工作台身份证")
    .replace(/workspace/g, "工作台")
    .replace(/Satellite/g, "项目")
    .replace(/registry/g, "登记表")
    .replace(/sync metadata/g, "同步信息");
}

function checkAuditProjectPath(result, projectRoot, relativePath, id, passMessage) {
  if (fs.existsSync(path.join(projectRoot, relativePath))) {
    auditAddProjectCheck(result, id, "pass", passMessage, relativePath);
  } else {
    auditAddProjectCheck(result, id, "warn", `缺少 ${relativePath}。`, relativePath);
  }
}

function readSyncState(workspaceRoot) {
  const runtimePath = path.join(workspaceRoot, ".starwork", "sync.json");
  const legacyPath = path.join(workspaceRoot, ".core-sync.json");
  const source = fs.existsSync(runtimePath) ? ".starwork/sync.json" : fs.existsSync(legacyPath) ? ".core-sync.json" : null;
  if (!source) return { ok: false, error: "缺少同步元数据。", source: ".starwork/sync.json" };
  try {
    const filePath = source === ".starwork/sync.json" ? runtimePath : legacyPath;
    return { ok: true, source, data: JSON.parse(fs.readFileSync(filePath, "utf8")) };
  } catch (error) {
    return { ok: false, source, error: `无法解析同步元数据：${error.message}` };
  }
}

function loadRepairBlueprint(blueprintPath) {
  const filePath = path.resolve(blueprintPath);
  let blueprint;
  try {
    blueprint = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`无法读取 repair blueprint：${error.message}`);
  }
  if (blueprint.schema !== "starwork.repair_blueprint.v0.1") {
    throw new Error("repair blueprint schema 必须是 starwork.repair_blueprint.v0.1。");
  }
  if (!blueprint.source?.hub) {
    throw new Error("repair blueprint 缺少 source.hub。");
  }
  if (!Array.isArray(blueprint.actions) || blueprint.actions.length === 0) {
    throw new Error("repair blueprint 必须包含 actions。");
  }
  return {
    ...blueprint,
    __path: filePath,
    __dir: path.dirname(filePath)
  };
}

function buildRepairPlan(blueprint) {
  const hubRoot = requireWorkspaceRoot(path.resolve(blueprint.source.hub));
  const hubState = readWorkspaceState(hubRoot);
  if (hubState.workspace_type !== "hub") {
    throw new Error("repair blueprint source.hub 必须指向项目中心。");
  }
  const hubPaths = getHubPaths(hubState);
  const registryPath = path.join(hubRoot, hubPaths.projectRegistry);
  const registry = readProjectRegistry(registryPath);
  const projectMap = new Map((registry.projects || []).map((project) => [getRegistryProjectId(project), project]));
  const actions = [];
  let nextRegistry = registry;

  for (const action of blueprint.actions) {
    if (!action?.type) throw new Error("repair action 缺少 type。");
    if (action.target === "satellite" && !action.project_id) {
      throw new Error(`repair action ${action.type} 写入 satellite 时必须包含 project_id。`);
    }
    const targetRoot = resolveRepairTargetRoot({ hubRoot, projectMap, action });
    if (action.type === "ensure_dir") {
      actions.push(directoryAction(targetRoot, normalizeSafeRelativePath(action.path, "repair ensure_dir.path")));
    } else if (action.type === "write_file_if_missing") {
      const relativePath = normalizeSafeRelativePath(action.path, "repair write_file_if_missing.path");
      const target = path.join(targetRoot, relativePath);
      actions.push(fs.existsSync(target)
        ? { type: "file", mode: "skip", target, relativePath, content: action.content || "" }
        : strictFileAction(targetRoot, relativePath, action.content || ""));
    } else if (action.type === "rewrite_core_sync") {
      const project = projectMap.get(action.project_id);
      const projectRoot = path.resolve(project.path);
      const state = readWorkspaceState(projectRoot);
      const sync = renderCoreSyncForProject({ hubRoot, hubState, project, projectId: action.project_id, language: state.language || "zh" });
      actions.push(overwriteFileAction(projectRoot, path.join(".starwork", "sync.json"), `${JSON.stringify({ ...sync, schema: "starwork.sync.v0.1", legacy_mirror: ".core-sync.json" }, null, 2)}\n`));
      actions.push(overwriteFileAction(projectRoot, ".core-sync.json", `${JSON.stringify({ ...sync, legacy_of: ".starwork/sync.json" }, null, 2)}\n`));
    } else if (action.type === "update_hub_registry") {
      nextRegistry = patchProjectRegistry(nextRegistry, action.project_id, action.patch || {});
    } else if (action.type === "update_workspace_state") {
      const current = readWorkspaceState(targetRoot);
      const patched = applyDottedPatch(current, action.patch || {}, allowedWorkspaceStateRepairPaths());
      actions.push(overwriteFileAction(targetRoot, path.join(".starwork", "workspace.json"), `${JSON.stringify(patched, null, 2)}\n`));
    } else {
      throw new Error(`repair blueprint 暂不支持 action.type：${action.type}`);
    }
  }
  if (nextRegistry !== registry) {
    actions.push(overwriteFileAction(hubRoot, hubPaths.projectRegistry, `${JSON.stringify(nextRegistry, null, 2)}\n`));
  }
  return { hubRoot, actions: dedupeActions(actions) };
}

function resolveRepairTargetRoot({ hubRoot, projectMap, action }) {
  if (action.target === "hub" || !action.target) return hubRoot;
  if (action.target !== "satellite") throw new Error(`repair action target 不支持：${action.target}`);
  const project = projectMap.get(action.project_id);
  if (!project?.path) throw new Error(`项目中心登记表中不存在项目或路径：${action.project_id}`);
  const projectRoot = path.resolve(project.path);
  if (!fs.existsSync(projectRoot)) throw new Error(`项目路径不存在：${projectRoot}`);
  return projectRoot;
}

function renderCoreSyncForProject({ hubRoot, hubState, project, projectId, language }) {
  const paths = getSatellitePaths(language);
  return {
    schema: "starwork.core_sync.v0.1",
    hub_path: hubRoot,
    project_id: projectId,
    project_name: project.name || projectId,
    core: "0.1",
    mode: "project",
    created_at: project.created_at || new Date().toISOString(),
    last_sync_at: new Date().toISOString(),
    resources: {
      identity: { source: "identity/", target: paths.identity, mode: "snapshot" },
      lessons: { source: "lessons/", target: paths.lessons, mode: "snapshot" },
      skills: { source: "skills/registry.json", target: [".agents/skills/", ".claude/skills/"], mode: "selected", items: [] }
    }
  };
}

function patchProjectRegistry(registry, projectId, patch) {
  const allowed = new Set(["path", "status", "name", "updated_at", "metadata"]);
  return {
    ...registry,
    projects: (registry.projects || []).map((project) => {
      if (getRegistryProjectId(project) !== projectId) return project;
      const next = { ...project };
      for (const [key, value] of Object.entries(patch)) {
        if (!allowed.has(key)) throw new Error(`update_hub_registry 不允许修改字段：${key}`);
        next[key] = value;
      }
      return next;
    })
  };
}

function applyDottedPatch(object, patch, allowed) {
  const next = JSON.parse(JSON.stringify(object));
  for (const [key, value] of Object.entries(patch)) {
    if (!allowed.some((prefix) => key === prefix || key.startsWith(`${prefix}.`))) {
      throw new Error(`update_workspace_state 不允许修改字段：${key}`);
    }
    const parts = key.split(".");
    let cursor = next;
    for (let i = 0; i < parts.length - 1; i += 1) {
      cursor[parts[i]] = cursor[parts[i]] && typeof cursor[parts[i]] === "object" ? cursor[parts[i]] : {};
      cursor = cursor[parts[i]];
    }
    cursor[parts[parts.length - 1]] = value;
  }
  return next;
}

function allowedWorkspaceStateRepairPaths() {
  return ["workspace_type", "kit", "hub", "paths", "language", "capabilities", "repair"];
}

function repairPlanResult(plan, dryRun) {
  return {
    schema: "starwork.repair.result.v0.1",
    dry_run: Boolean(dryRun),
    hub: plan.hubRoot,
    summary: {
      actions_total: plan.actions.length,
      planned: plan.actions.length,
      applied: dryRun ? 0 : plan.actions.length,
      skipped: plan.actions.filter((action) => action.mode === "skip" || action.mode === "exists").length,
      failed: 0
    },
    actions: plan.actions.map((action) => ({
      type: action.type,
      mode: action.mode,
      path: action.relativePath
    }))
  };
}

function ensureProjectCanBeRegistered(registry, projectId, targetPath) {
  const projects = Array.isArray(registry.projects) ? registry.projects : [];
  if (projects.some((project) => project?.id === projectId)) {
    throw new Error(`项目中心登记表已存在项目 ID：${projectId}`);
  }
  if (projects.some((project) => project?.path && path.resolve(project.path) === targetPath)) {
    throw new Error(`项目中心登记表已存在目标路径：${targetPath}`);
  }
}

function renderSpawnProjectStatus({ projectName, projectId, hubRoot, mode, language, modeConfig, blueprint }) {
  if (language === "en") {
    const descriptionText = cleanProjectFactText(blueprint?.description);
    const description = descriptionText
      ? `\n## Project Positioning\n\n${descriptionText}\n`
      : "";
    const agreements = blueprint
      ? `\n## Project Agreements\n\n- Formal source: \`${modeConfig.formalSource}\`\n- Business work area: \`${modeConfig.businessWorkArea}\`\n- Declared folders: ${(blueprint.folders || []).map((folder) => `\`${normalizeSafeRelativePath(folder, "blueprint.folders")}\``).join(", ") || "None"}\n`
      : "";
    return `# Current Project

## Goal

${projectName}
${description}

## Project Info

- Project ID: ${projectId}
- Project Center: ${hubRoot}
${agreements}

## Current Stage

TBD.

## Focus

- TBD.

## Primary Sources

- \`${modeConfig.formalSource}\`
- \`${modeConfig.businessWorkArea}\`

## Risks

- Do not treat the Project Center registry as project progress.
- Project Center sync resources are read-only by default; project updates should use handoff or writeback flows.

## Next Step

- TBD.
`;
  }
  const descriptionText = cleanProjectFactText(blueprint?.description);
  const description = descriptionText
    ? `\n## 项目定位\n\n${descriptionText}\n`
    : "";
  const agreements = blueprint
    ? `\n## 项目约定\n\n- 正式事实源：\`${modeConfig.formalSource}\`\n- 当前工作区：\`${modeConfig.businessWorkArea}\`\n- 固定目录：${(blueprint.folders || []).map((folder) => `\`${normalizeSafeRelativePath(folder, "blueprint.folders")}\``).join("、") || "无"}\n`
    : "";
  return `# 当前项目

## 目标

${projectName}
${description}

## 项目信息

- 项目 ID：${projectId}
- 项目中心：${hubRoot}
${agreements}

## 当前阶段

待填写。

## 近期重点

- 待填写。

## 主要事实源

- \`${modeConfig.formalSource}\`
- \`${modeConfig.businessWorkArea}\`

## 风险

- 不要把项目中心的项目注册表当成项目进度正文。
- 主库同步资源默认只读，项目内更新应走跨项目联络或回写流程。

## 下一步

- 待填写。
`;
}

function cleanProjectFactText(text) {
  if (!text || typeof text !== "string") return "";
  if (/(Initialized as|StarWork project workspace|blueprint|dry-run|doctor|Folders Not Used|generated by starwork|created by starwork)/i.test(text)) {
    return "";
  }
  return text.trim();
}

function buildLanesInitPlan({ workspaceRoot, lanes }) {
  const state = readWorkspaceState(workspaceRoot);
  const collaboration = getCollaborationPaths(state);
  const actions = [
    directoryAction(workspaceRoot, collaboration.root),
    directoryAction(workspaceRoot, path.join(".starwork", "agent-lanes")),
    fileAction(workspaceRoot, collaboration.registry, renderAgentLanesRegistry(lanes)),
    fileAction(workspaceRoot, collaboration.shared, renderSharedContext({ outputs: [], requests: [], agreements: [] })),
    fileAction(workspaceRoot, path.join(".starwork", "agent-lanes", "state.json"), renderAgentLanesState(defaultAgentLanesState()))
  ];
  for (const lane of lanes) {
    actions.push(fileAction(workspaceRoot, path.join(collaboration.root, lane.worklog), renderLaneWorklog(lane.lane)));
    actions.push(fileAction(workspaceRoot, path.join(collaboration.root, lane.workspace, "README.md"), renderLaneWorkspaceReadme(lane.lane, collaboration)));
  }
  return {
    targetDir: workspaceRoot,
    actions: dedupeActions(actions)
  };
}

function buildLanesRegistryPlan(workspaceRoot, lanes, extraActions = []) {
  const collaboration = getCollaborationPaths(readWorkspaceState(workspaceRoot));
  return {
    targetDir: workspaceRoot,
    actions: dedupeActions([
      overwriteFileAction(workspaceRoot, collaboration.registry, renderAgentLanesRegistry(lanes)),
      ...extraActions
    ])
  };
}

function getCollaborationPaths(state = {}) {
  const root = state.language === "en" ? path.join("_system", "collaboration") : path.join("_系统", "协作");
  return {
    root,
    registry: path.join(root, "agent-lanes.md"),
    shared: path.join(root, "shared.md")
  };
}

function agentLanesStatePath(workspaceRoot) {
  return path.join(workspaceRoot, ".starwork", "agent-lanes", "state.json");
}

function defaultAgentLanesState() {
  return {
    version: 1,
    lanes: {},
    requests: []
  };
}

function readAgentLanesState(workspaceRoot) {
  const statePath = agentLanesStatePath(workspaceRoot);
  if (!fs.existsSync(statePath)) return defaultAgentLanesState();
  try {
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    return {
      version: 1,
      lanes: state.lanes && typeof state.lanes === "object" ? state.lanes : {},
      requests: Array.isArray(state.requests) ? state.requests : []
    };
  } catch (error) {
    throw new Error(`无法读取 Agent Lanes 机器状态：${error.message}`);
  }
}

function renderAgentLanesState(state) {
  return `${JSON.stringify({
    version: 1,
    lanes: state.lanes || {},
    requests: state.requests || []
  }, null, 2)}\n`;
}

function stateFileAction(workspaceRoot, state) {
  return overwriteFileAction(workspaceRoot, path.join(".starwork", "agent-lanes", "state.json"), renderAgentLanesState(state));
}

function buildSharedContextPlan(workspaceRoot, shared) {
  const collaboration = getCollaborationPaths(readWorkspaceState(workspaceRoot));
  return {
    targetDir: workspaceRoot,
    actions: [
      overwriteFileAction(workspaceRoot, collaboration.shared, renderSharedContext(shared))
    ]
  };
}

function readLanesRegistry(workspaceRoot) {
  const registryPath = path.join(workspaceRoot, getCollaborationPaths(readWorkspaceState(workspaceRoot)).registry);
  if (!fs.existsSync(registryPath)) {
    throw new Error("当前工作台尚未启用 Agent Lanes。请先运行 starwork multiagent init。");
  }
  return {
    path: registryPath,
    lanes: parseMarkdownTableSection(fs.readFileSync(registryPath, "utf8"), "## Lanes", ["lane", "purpose", "current_session", "write_scope", "worklog", "workspace"])
      .map(normalizeLaneRecord)
  };
}

function readSharedContext(workspaceRoot) {
  const sharedPath = path.join(workspaceRoot, getCollaborationPaths(readWorkspaceState(workspaceRoot)).shared);
  if (!fs.existsSync(sharedPath)) {
    return { outputs: [], requests: [], agreements: [] };
  }
  const content = fs.readFileSync(sharedPath, "utf8");
  const requests = parseMarkdownTableSection(content, "## Cross-Lane Requests", ["id", "from", "to", "request", "status", "host_delivery", "link", "updated"]);
  return {
    outputs: parseMarkdownTableSection(content, "## Shared Outputs", ["from", "title", "path", "audience", "status", "updated"]),
    requests: requests.length ? requests : parseMarkdownTableSection(content, "## Cross-Lane Requests", ["from", "to", "request", "status", "link"]).map((row) => ({
      id: "",
      from: row.from,
      to: row.to,
      request: row.request,
      status: row.status,
      host_delivery: "",
      link: row.link,
      updated: ""
    })),
    agreements: parseMarkdownTableSection(content, "## Shared Agreements", ["agreement", "owner", "status", "link"])
  };
}

function inspectMultiagentCompatibility(workspaceRoot) {
  const workspaceState = readWorkspaceState(workspaceRoot);
  const collaboration = getCollaborationPaths(workspaceState);
  const stateInfo = readAgentLanesStateRaw(workspaceRoot);
  const currentRegistry = readLanesRegistryTolerant(workspaceRoot, collaboration.registry, "current_language_markdown");
  const currentShared = readSharedContextTolerant(workspaceRoot, collaboration.shared, "current_language_markdown");
  const alternate = getAlternateCollaborationPaths(collaboration.root);
  const alternateRegistry = alternate ? readLanesRegistryTolerant(workspaceRoot, alternate.registry, "alternate_language_markdown") : emptyRegistryRead(null, "alternate_language_markdown");
  const alternateShared = alternate ? readSharedContextTolerant(workspaceRoot, alternate.shared, "alternate_language_markdown") : emptySharedRead(null, "alternate_language_markdown");
  const legacyClasses = [];
  const conflicts = [];
  const warnings = [];
  const readSources = [];
  if (stateInfo.exists) readSources.push(".starwork/agent-lanes/state.json");
  if (currentRegistry.exists) readSources.push(collaboration.registry);
  if (currentShared.exists) readSources.push(collaboration.shared);

  if (stateInfo.exists && stateInfo.parseError) {
    legacyClasses.push("malformed_state");
  } else if (stateInfo.exists && stateInfo.version === 1) {
    legacyClasses.push("state_v1_current");
  } else if (stateInfo.exists && stateInfo.version == null) {
    legacyClasses.push("state_unversioned");
  }
  if (!stateInfo.exists && currentRegistry.lanes.length) legacyClasses.push("markdown_only");
  if (stateInfo.exists && !stateInfo.parseError && stateInfo.lanes.length && !currentRegistry.exists) legacyClasses.push("state_only");
  if ((alternateRegistry.lanes.length || alternateShared.requests.length) && (currentRegistry.lanes.length || currentShared.requests.length || stateInfo.lanes.length)) {
    legacyClasses.push("mixed_language_paths");
    conflicts.push(`当前语言协作路径和另一套语言协作路径都存在 MultiAgent 记录：${collaboration.root} / ${alternate.root}`);
  }
  const stateByLane = new Map(stateInfo.lanes.map((lane) => [lane.lane, lane]));
  for (const lane of currentRegistry.lanes) {
    const stateLane = stateByLane.get(lane.lane);
    if (!stateLane) continue;
    if (stateLane.current_session && lane.current_session && stateLane.current_session !== lane.current_session) {
      legacyClasses.push("conflicting_lane");
      conflicts.push(`lane ${lane.lane} 的 state.json session ${stateLane.current_session} 与 agent-lanes.md ${lane.current_session} 不一致`);
    }
  }
  if (currentRegistry.exists && currentRegistry.parseWarning) warnings.push(currentRegistry.parseWarning);
  if (currentShared.exists && currentShared.parseWarning) warnings.push(currentShared.parseWarning);
  const lanes = mergeCompatibleLanes(currentRegistry.lanes, stateInfo.lanes);
  const shared = currentShared.exists ? currentShared.shared : { outputs: [], requests: [], agreements: [] };
  const status = resolveMultiagentCompatibilityStatus({ stateInfo, currentRegistry, lanes, conflicts, legacyClasses });
  const requiredForWrite = status === "migration_required_for_write" || status === "blocked_conflict" || status === "unknown_partial";
  return {
    workspaceRoot,
    collaboration,
    stateInfo,
    registry: currentRegistry,
    shared,
    alternateRegistry,
    alternateShared,
    lanes,
    conflicts,
    warnings,
    compatibility: {
      status,
      structure_version: stateInfo.version,
      target_structure_version: 1,
      legacy_classes: [...new Set(legacyClasses.filter((item) => item !== "state_v1_current" || status === "current"))],
      read_sources: readSources,
      required_for_write: requiredForWrite,
      migration: {
        required_for_write: requiredForWrite,
        available: ["migration_required_for_write", "current"].includes(status) && conflicts.length === 0,
        dry_run_command: `starwork multiagent upgrade --target ${workspaceRoot} --dry-run`
      },
      conflicts,
      warnings
    }
  };
}

function readAgentLanesStateRaw(workspaceRoot) {
  const statePath = agentLanesStatePath(workspaceRoot);
  if (!fs.existsSync(statePath)) {
    return { exists: false, path: statePath, version: null, data: defaultAgentLanesState(), lanes: [], requests: [], parseError: null };
  }
  try {
    const data = JSON.parse(fs.readFileSync(statePath, "utf8"));
    const lanesObject = data.lanes && typeof data.lanes === "object" ? data.lanes : {};
    const lanes = Object.entries(lanesObject).map(([laneId, record]) => normalizeLaneRecord({
      lane: laneId,
      purpose: normalizeMarkdownCell(record?.purpose || "待补充"),
      current_session: normalizeMarkdownCell(record?.current_session || "unbound"),
      write_scope: normalizeMarkdownCell(record?.write_scope || "待补充"),
      worklog: record?.worklog || defaultLaneWorklogPath(laneId),
      workspace: record?.workspace || defaultLaneWorkspacePath(laneId)
    }));
    return {
      exists: true,
      path: statePath,
      version: Number.isInteger(data.version) ? data.version : null,
      data,
      lanes,
      requests: Array.isArray(data.requests) ? data.requests : [],
      parseError: null
    };
  } catch (error) {
    return { exists: true, path: statePath, version: null, data: null, lanes: [], requests: [], parseError: error.message };
  }
}

function readLanesRegistryTolerant(workspaceRoot, relativePath, source) {
  const registryPath = path.join(workspaceRoot, relativePath);
  if (!fs.existsSync(registryPath)) return emptyRegistryRead(relativePath, source);
  const content = fs.readFileSync(registryPath, "utf8");
  const lanes = parseMarkdownTableSection(content, "## Lanes", ["lane", "purpose", "current_session", "write_scope", "worklog", "workspace"])
    .filter((row) => row.lane)
    .map(normalizeLaneRecord);
  const hasLanesHeading = /^## Lanes\s*$/m.test(content);
  return {
    exists: true,
    relativePath,
    source,
    lanes,
    parseWarning: hasLanesHeading && !lanes.length ? `${relativePath} 包含 Lanes 段落但没有可解析 lane 表格。` : null
  };
}

function emptyRegistryRead(relativePath, source) {
  return { exists: false, relativePath, source, lanes: [], parseWarning: null };
}

function readSharedContextTolerant(workspaceRoot, relativePath, source) {
  const sharedPath = path.join(workspaceRoot, relativePath);
  if (!fs.existsSync(sharedPath)) return emptySharedRead(relativePath, source);
  const content = fs.readFileSync(sharedPath, "utf8");
  const requests = parseMarkdownTableSection(content, "## Cross-Lane Requests", ["id", "from", "to", "request", "status", "host_delivery", "link", "updated"]);
  const legacyRequests = requests.length ? [] : parseMarkdownTableSection(content, "## Cross-Lane Requests", ["from", "to", "request", "status", "link"]).map((row) => ({
    id: "",
    from: row.from,
    to: row.to,
    request: row.request,
    status: row.status,
    host_delivery: "",
    link: row.link,
    updated: ""
  }));
  const shared = {
    outputs: parseMarkdownTableSection(content, "## Shared Outputs", ["from", "title", "path", "audience", "status", "updated"]),
    requests: requests.length ? requests : legacyRequests,
    agreements: parseMarkdownTableSection(content, "## Shared Agreements", ["agreement", "owner", "status", "link"])
  };
  const hasRequestsHeading = /^## Cross-Lane Requests\s*$/m.test(content);
  return {
    exists: true,
    relativePath,
    source,
    shared,
    requests: shared.requests,
    parseWarning: hasRequestsHeading && !shared.requests.length ? `${relativePath} 包含 Cross-Lane Requests 段落但没有可解析 request 表格。` : null
  };
}

function emptySharedRead(relativePath, source) {
  return { exists: false, relativePath, source, shared: { outputs: [], requests: [], agreements: [] }, requests: [], parseWarning: null };
}

function getAlternateCollaborationPaths(currentRoot) {
  const alternateRoot = currentRoot === path.join("_系统", "协作")
    ? path.join("_system", "collaboration")
    : path.join("_系统", "协作");
  return {
    root: alternateRoot,
    registry: path.join(alternateRoot, "agent-lanes.md"),
    shared: path.join(alternateRoot, "shared.md")
  };
}

function mergeCompatibleLanes(markdownLanes, stateLanes) {
  const byLane = new Map();
  for (const lane of stateLanes) byLane.set(lane.lane, normalizeLaneRecord(lane));
  for (const lane of markdownLanes) {
    const stateLane = byLane.get(lane.lane) || {};
    byLane.set(lane.lane, normalizeLaneRecord({
      ...stateLane,
      ...lane,
      current_session: lane.current_session && lane.current_session !== "unbound"
        ? lane.current_session
        : (stateLane.current_session || lane.current_session || "unbound")
    }));
  }
  return [...byLane.values()].sort((a, b) => a.lane.localeCompare(b.lane));
}

function resolveMultiagentCompatibilityStatus({ stateInfo, currentRegistry, lanes, conflicts, legacyClasses }) {
  if (conflicts.length || legacyClasses.includes("mixed_language_paths") || legacyClasses.includes("conflicting_lane")) return "blocked_conflict";
  if (stateInfo.exists && stateInfo.parseError) return lanes.length || currentRegistry.lanes.length ? "unknown_partial" : "blocked_conflict";
  if (!stateInfo.exists && !currentRegistry.exists && lanes.length === 0) return "current";
  if (stateInfo.version === 1 && currentRegistry.exists) return "current";
  if (legacyClasses.includes("state_unversioned") || legacyClasses.includes("markdown_only") || legacyClasses.includes("state_only")) {
    return "migration_required_for_write";
  }
  return "current";
}

function assertMultiagentWritable(workspaceRoot) {
  const compatibility = inspectMultiagentCompatibility(workspaceRoot).compatibility;
  if (!compatibility.required_for_write) return;
  throw new Error(`检测到旧版或冲突的 MultiAgent 协作记录（${compatibility.status}）。写入前请先运行：${compatibility.migration.dry_run_command}`);
}

function workflowRunsDir(workspaceRoot) {
  return path.join(workspaceRoot, ".starwork", "workflows", "runs");
}

function workflowRunPath(workspaceRoot, runId) {
  return path.join(workflowRunsDir(workspaceRoot), `${normalizeWorkflowRunId(runId)}.json`);
}

function normalizeWorkflowRunId(value) {
  const raw = normalizeMarkdownCell(value || "");
  if (!raw || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(raw)) {
    throw new Error(`workflow run id 只能包含字母、数字、点、短横线和下划线：${value}`);
  }
  return raw;
}

function requireWorkflowRunId(value) {
  if (!value) throw new Error("需要 --run <run-id>。");
  return normalizeWorkflowRunId(value);
}

function normalizeWorkflowNodeId(value, label) {
  const raw = normalizeMarkdownCell(value || "");
  if (!raw || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(raw)) {
    throw new Error(`${label} 只能包含字母、数字、点、短横线和下划线：${value}`);
  }
  return raw;
}

function buildWorkflowRunId(workflowId) {
  return `WF-${timestampForFile()}-${slugifyProjectId(workflowId || "workflow")}`;
}

function readWorkflowRun(workspaceRoot, runId) {
  const file = workflowRunPath(workspaceRoot, runId);
  if (!fs.existsSync(file)) {
    throw new Error(`找不到 workflow run state：${runId}`);
  }
  try {
    const run = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!run.run_id) throw new Error("缺少 run_id");
    if (!run.workflow_definition_path) throw new Error("缺少 workflow_definition_path");
    if (!Array.isArray(run.events)) run.events = [];
    return run;
  } catch (error) {
    throw new Error(`无法读取 workflow run state：${error.message}`);
  }
}

function writeWorkflowRun(workspaceRoot, run) {
  fs.mkdirSync(workflowRunsDir(workspaceRoot), { recursive: true });
  fs.writeFileSync(workflowRunPath(workspaceRoot, run.run_id), `${JSON.stringify(run, null, 2)}\n`, "utf8");
}

function loadWorkflowDefinition(definitionPath, workspaceRoot) {
  const absolute = path.resolve(definitionPath);
  if (!fs.existsSync(absolute)) throw new Error(`Workflow definition 不存在：${definitionPath}`);
  const content = fs.readFileSync(absolute, "utf8");
  const parsed = parseWorkflowDefinitionContent(content);
  if (!parsed || typeof parsed !== "object") throw new Error("Workflow definition 解析结果无效。");
  if (!parsed.workflow_id) throw new Error("Workflow definition 缺少 workflow_id。");
  if (!parsed.nodes || typeof parsed.nodes !== "object") throw new Error("Workflow definition 缺少 nodes。");
  return {
    workflow_id: normalizeWorkflowNodeId(parsed.workflow_id, "workflow_id"),
    version: normalizeMarkdownCell(parsed.version || parsed.workflow_version || "0.1"),
    status: normalizeMarkdownCell(parsed.status || "confirmed"),
    entry: parsed.entry || {},
    nodes: parsed.nodes,
    path: absolute,
    relative_path: normalizeWorkflowDefinitionPath(absolute, workspaceRoot)
  };
}

function normalizeWorkflowDefinitionPath(absolute, workspaceRoot) {
  const relative = normalizeRelativePath(path.relative(workspaceRoot, absolute));
  if (!relative.startsWith("..")) return relative;
  return absolute;
}

function parseWorkflowDefinitionContent(content) {
  const trimmed = content.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const fencedJson = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (fencedJson) return JSON.parse(fencedJson[1]);
  const fencedYaml = trimmed.match(/```ya?ml\s*([\s\S]*?)```/i);
  return parseSimpleWorkflowYaml(fencedYaml ? fencedYaml[1] : trimmed);
}

function parseSimpleWorkflowYaml(content) {
  const definition = { nodes: {} };
  let section = null;
  let currentNode = null;
  let inTransitions = false;
  let currentTransition = null;
  for (const rawLine of content.split(/\r?\n/)) {
    const withoutComment = rawLine.replace(/\s+#.*$/, "");
    if (!withoutComment.trim()) continue;
    const indent = withoutComment.match(/^\s*/)[0].length;
    const line = withoutComment.trim();
    const kv = line.match(/^([^:]+):(?:\s*(.*))?$/);
    if (!kv) continue;
    const key = kv[1].trim();
    const value = parseSimpleYamlScalar(kv[2] || "");
    if (indent === 0) {
      section = key;
      currentNode = null;
      currentTransition = null;
      inTransitions = false;
      if (value !== "") definition[key] = value;
      else if (key === "entry") definition.entry = {};
      else if (key === "nodes") definition.nodes = {};
      continue;
    }
    if (section === "entry" && indent === 2) {
      definition.entry[key] = value;
      continue;
    }
    if (section !== "nodes") continue;
    if (indent === 2 && value === "") {
      currentNode = key;
      definition.nodes[currentNode] = definition.nodes[currentNode] || {};
      inTransitions = false;
      currentTransition = null;
      continue;
    }
    if (!currentNode) continue;
    if (indent === 4 && key === "transitions") {
      definition.nodes[currentNode].transitions = definition.nodes[currentNode].transitions || {};
      inTransitions = true;
      currentTransition = null;
      continue;
    }
    if (indent === 4 && !inTransitions) {
      definition.nodes[currentNode][key] = value;
      continue;
    }
    if (indent === 6 && inTransitions && value === "") {
      currentTransition = key;
      definition.nodes[currentNode].transitions[currentTransition] = definition.nodes[currentNode].transitions[currentTransition] || {};
      continue;
    }
    if (indent === 8 && inTransitions && currentTransition) {
      definition.nodes[currentNode].transitions[currentTransition][key] = value;
    }
  }
  return definition;
}

function parseSimpleYamlScalar(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  return trimmed.replace(/^["']|["']$/g, "");
}

function getWorkflowNodeOrThrow(definition, nodeId) {
  const node = definition.nodes?.[nodeId];
  if (!node) throw new Error(`Workflow definition 找不到节点：${nodeId}`);
  return node;
}

function parseWorkflowRouteEvent(eventValue) {
  if (!eventValue) return null;
  const raw = String(eventValue).trim();
  if (!raw) return null;
  if (raw.startsWith("{")) {
    const event = JSON.parse(raw);
    return normalizeWorkflowNodeId(event.outcome || event.key || event.event || event.type || event.status, "workflow event");
  }
  return normalizeWorkflowNodeId(raw, "workflow event");
}

function resolveCurrentWorkflowSession(options) {
  if (options.currentSession) return normalizeHostSession(options.currentSession, options.agent);
  if (process.env.CODEX_THREAD_ID) return `codex:${process.env.CODEX_THREAD_ID}`;
  if (process.env.CLAUDE_CODE_SESSION_ID) return `claude-code:${process.env.CLAUDE_CODE_SESSION_ID}`;
  return null;
}

function computeWorkflowRoute({ workspaceRoot, registry, definition, run, eventKey, currentSession }) {
  const currentNodeId = normalizeWorkflowNodeId(run.current_node || run.current_step, "current node");
  const currentNode = getWorkflowNodeOrThrow(definition, currentNodeId);
  const fromLane = normalizeLaneId(run.current_actor_lane || currentNode.actor_lane, "from lane");
  const transitionEntry = selectWorkflowTransition(currentNode, eventKey);
  if (!transitionEntry) {
    return buildWorkflowRouteResult({
      run,
      definition,
      fromLane,
      targetNode: null,
      toLane: null,
      targetSession: null,
      eventKey,
      routeStatus: "blocked_missing_route",
      blockedReason: "definition_missing_transition"
    });
  }
  const [transitionKey, transition] = transitionEntry;
  const targetNode = normalizeMarkdownCell(transition.target_node || "");
  if (!targetNode || targetNode === "stop") {
    return buildWorkflowRouteResult({
      run,
      definition,
      fromLane,
      targetNode: targetNode || "stop",
      toLane: null,
      targetSession: null,
      eventKey: transitionKey,
      routeStatus: "completed",
      blockedReason: null
    });
  }
  const toLaneRaw = transition.target_lane || definition.nodes?.[targetNode]?.actor_lane || "";
  if (!toLaneRaw) {
    return buildWorkflowRouteResult({
      run,
      definition,
      fromLane,
      targetNode,
      toLane: null,
      targetSession: null,
      eventKey: transitionKey,
      routeStatus: "blocked_missing_route",
      blockedReason: "target_lane_missing"
    });
  }
  const toLane = normalizeLaneId(toLaneRaw, "target lane");
  const targetLane = findLaneOrThrow(registry.lanes, toLane);
  const lanesState = readAgentLanesState(workspaceRoot);
  const targetSession = lanesState.lanes?.[toLane]?.current_session || targetLane.current_session || "unbound";
  const allowSelfStep = Boolean(transition.allow_self_step || currentNode.allow_self_step);
  if (fromLane === toLane) {
    return buildWorkflowRouteResult({
      run,
      definition,
      fromLane,
      targetNode,
      toLane,
      targetSession,
      eventKey: transitionKey,
      routeStatus: allowSelfStep ? "self_step_recorded" : "blocked_self_delivery",
      blockedReason: allowSelfStep ? null : "lane_guard_from_lane_equals_to_lane"
    });
  }
  if (targetSession && targetSession !== "unbound" && currentSession && workflowSessionsMatch(currentSession, targetSession)) {
    return buildWorkflowRouteResult({
      run,
      definition,
      fromLane,
      targetNode,
      toLane,
      targetSession,
      eventKey: transitionKey,
      routeStatus: allowSelfStep ? "self_step_recorded" : "blocked_self_delivery",
      blockedReason: allowSelfStep ? null : "session_guard_current_session_equals_target_session"
    });
  }
  if (!targetSession || targetSession === "unbound") {
    return buildWorkflowRouteResult({
      run,
      definition,
      fromLane,
      targetNode,
      toLane,
      targetSession: targetSession || "unbound",
      eventKey: transitionKey,
      routeStatus: "manual_confirmation_required",
      blockedReason: "target_session_missing"
    });
  }
  return buildWorkflowRouteResult({
    run,
    definition,
    fromLane,
    targetNode,
    toLane,
    targetSession,
    eventKey: transitionKey,
    routeStatus: "ready",
    blockedReason: null
  });
}

function selectWorkflowTransition(node, eventKey) {
  const transitions = node.transitions && typeof node.transitions === "object" ? node.transitions : {};
  const entries = Object.entries(transitions);
  if (!entries.length) return null;
  if (eventKey && transitions[eventKey]) return [eventKey, transitions[eventKey]];
  if (eventKey && !transitions[eventKey]) return null;
  return entries[0];
}

function workflowSessionsMatch(currentSession, targetSession) {
  const current = parseAdapterSession(currentSession);
  const target = parseAdapterSession(targetSession);
  if (!current.id || !target.id) return false;
  return current.host === target.host && current.id === target.id;
}

function buildWorkflowRouteResult({ run, definition, fromLane, targetNode, toLane, targetSession, eventKey, routeStatus, blockedReason }) {
  const deliveryMode = routeStatus === "ready"
    ? "codex_thread_tool"
    : (routeStatus === "manual_confirmation_required" || routeStatus === "manual_handoff_required" ? "manual_handoff" : "blocked");
  return {
    schema: WORKFLOW_ROUTE_SCHEMA,
    run_id: run.run_id,
    workflow_id: definition.workflow_id,
    workflow_version: definition.version,
    workflow_definition_path: definition.relative_path,
    current_node: run.current_node || run.current_step,
    current_step: run.current_step || run.current_node,
    from_lane: fromLane,
    target_node: targetNode,
    to_lane: toLane,
    target_session: targetSession || null,
    route_status: routeStatus,
    blocked_reason: blockedReason,
    route_source: "definition + run_state",
    route_event: eventKey,
    delivery_mode: deliveryMode,
    user_message: routeStatus === "blocked_self_delivery"
      ? "我发现下一步目标会指向当前 Agent 自己，这可能是 workflow 配置或路由错误，已停止自动投递。"
      : null,
    guarantees: routeStatus === "blocked_self_delivery" || routeStatus === "manual_confirmation_required" || routeStatus === "self_step_recorded"
      ? {
        send_tool_called: false,
        delivered_request_recorded: false,
        delivered_wording_allowed: false
      }
      : undefined
  };
}

function applyWorkflowRouteToRun(run, route) {
  run.status = route.route_status;
  run.current_node = route.current_node;
  run.current_step = route.current_step;
  run.current_actor_lane = route.from_lane;
  run.next_target_node = route.target_node;
  run.next_target_lane = route.to_lane;
  run.blocked_reason = route.blocked_reason;
  run.route_source = route.route_source;
  run.updated_at = new Date().toISOString();
  appendWorkflowEvent(run, {
    type: route.route_status === "ready" ? "route_ready" : `route_${route.route_status}`,
    actor_lane: route.from_lane,
    node: route.current_node,
    status: route.route_status,
    route_event: route.route_event,
    target_node: route.target_node,
    target_lane: route.to_lane,
    target_session: route.target_session,
    blocked_reason: route.blocked_reason
  });
}

function appendWorkflowEvent(run, event) {
  if (!Array.isArray(run.events)) run.events = [];
  const now = new Date().toISOString();
  const eventId = `EVT-${timestampForFile()}-${String(run.events.length + 1).padStart(3, "0")}`;
  const record = {
    event_id: eventId,
    type: event.type,
    actor_lane: event.actor_lane || run.current_actor_lane,
    node: event.node || run.current_node,
    status: event.status || run.status,
    created_at: now,
    ...(event.route_event ? { route_event: event.route_event } : {}),
    ...(event.from_node ? { from_node: event.from_node } : {}),
    ...(event.from_lane ? { from_lane: event.from_lane } : {}),
    ...(event.target_node ? { target_node: event.target_node } : {}),
    ...(event.target_lane ? { target_lane: event.target_lane } : {}),
    ...(event.target_session ? { target_session: event.target_session } : {}),
    ...(event.blocked_reason ? { blocked_reason: event.blocked_reason } : {}),
    ...(event.message ? { message: event.message } : {})
  };
  run.events.push(record);
  run.last_event_id = eventId;
  run.updated_at = now;
  return record;
}

function advanceWorkflowRunAfterDelivered(run) {
  const fromNode = run.current_node || run.current_step;
  const fromLane = run.current_actor_lane;
  const targetNode = run.next_target_node;
  const targetLane = run.next_target_lane;
  if (!targetNode || !targetLane) {
    throw new Error("workflow delivered 后无法推进：缺少 next target。");
  }
  run.current_node = targetNode;
  run.current_step = targetNode;
  run.current_actor_lane = targetLane;
  run.next_target_node = null;
  run.next_target_lane = null;
  run.blocked_reason = null;
  run.updated_at = new Date().toISOString();
  appendWorkflowEvent(run, {
    type: "step_entered",
    status: run.status,
    actor_lane: targetLane,
    node: targetNode,
    from_node: fromNode,
    from_lane: fromLane,
    target_node: targetNode,
    target_lane: targetLane
  });
}

function normalizeWorkflowStatus(status) {
  const normalized = normalizeMarkdownCell(status);
  if (!WORKFLOW_RUN_STATUSES.has(normalized)) {
    throw new Error(`不支持的 workflow status：${status}`);
  }
  return normalized;
}

function isWorkflowBlockedStatus(status) {
  return ["blocked_self_delivery", "manual_confirmation_required", "blocked_missing_route", MANUAL_HANDOFF_STATUS, "failed"].includes(status);
}

function validateWorkflowStatusTransition(currentStatus, nextStatus) {
  const current = normalizeWorkflowStatus(currentStatus || "planned");
  const next = normalizeWorkflowStatus(nextStatus);
  if (next === "delivered" && current !== "delivering") {
    throw new Error(`非法 workflow 状态转换：${current} -> delivered。delivered 必须先经过 delivering。`);
  }
  if ((current === "blocked_self_delivery" || current === "self_step_recorded") && next === "delivered") {
    throw new Error(`非法 workflow 状态转换：${current} -> delivered。阻断或 self step 不能记录为 delivered。`);
  }
  const allowed = {
    planned: new Set(["ready", "failed"]),
    ready: new Set(["delivering", "blocked_self_delivery", "manual_confirmation_required", "blocked_missing_route", MANUAL_HANDOFF_STATUS, "self_step_recorded", "completed", "failed"]),
    delivering: new Set(["delivered", MANUAL_HANDOFF_STATUS, "failed"]),
    delivered: new Set(["ready", "completed", "failed"]),
    blocked_self_delivery: new Set(["manual_confirmation_required", "failed"]),
    manual_confirmation_required: new Set(["self_step_recorded", "failed"]),
    blocked_missing_route: new Set(["manual_confirmation_required", "failed"]),
    [MANUAL_HANDOFF_STATUS]: new Set(["delivering", "failed"]),
    self_step_recorded: new Set(["ready", "completed", "failed"]),
    completed: new Set([]),
    failed: new Set([])
  };
  if (!allowed[current]?.has(next)) {
    throw new Error(`非法 workflow 状态转换：${current} -> ${next}`);
  }
}

function printWorkflowRoute(route) {
  console.log("");
  console.log("Workflow route preflight");
  console.log("");
  console.log(`run id: ${route.run_id}`);
  console.log(`workflow id: ${route.workflow_id}`);
  console.log(`current step: ${route.current_step}`);
  console.log(`from lane: ${route.from_lane}`);
  console.log(`target node: ${route.target_node || "(none)"}`);
  console.log(`target lane: ${route.to_lane || "(none)"}`);
  console.log(`target session: ${route.target_session || "(none)"}`);
  console.log(`route source: ${route.route_source}`);
  console.log(`delivery mode: ${route.delivery_mode}`);
  console.log(`route status: ${route.route_status}`);
  if (route.user_message) console.log(route.user_message);
  if (route.blocked_reason) console.log(`blocked reason: ${route.blocked_reason}`);
}

function buildMultiagentMigrationPlan(workspaceRoot) {
  const report = inspectMultiagentCompatibility(workspaceRoot);
  const timestamp = timestampForFile();
  const actions = [];
  const willCreate = [];
  const willUpdate = [];
  const willPreserve = [];
  const willNotTouch = [
    "不删除旧文件",
    "不覆盖非空 worklog、shared outputs 或 request 记录",
    "不创建、通知、改名、置顶或归档任何 AI 会话",
    "不修改 AGENTS.md / CLAUDE.md / README.md"
  ];
  const backupSources = [];
  const stateRelativePath = path.join(".starwork", "agent-lanes", "state.json");
  const stateExists = report.stateInfo.exists && !report.stateInfo.parseError;
  const safeToApply = report.conflicts.length === 0 && !report.stateInfo.parseError;
  let nextState = stateExists ? normalizeAgentLanesStateData(report.stateInfo.data) : defaultAgentLanesState();
  if (!report.stateInfo.exists || report.compatibility.legacy_classes.includes("markdown_only")) {
    nextState = {
      version: 1,
      lanes: Object.fromEntries(report.lanes.map((lane) => [lane.lane, laneToStateRecord(lane)])),
      requests: report.shared.requests.map(sharedRequestToStateRequest)
    };
    actions.push(directoryAction(workspaceRoot, path.join(".starwork", "agent-lanes")));
    actions.push(upsertFileAction(workspaceRoot, stateRelativePath, renderAgentLanesState(nextState)));
    willCreate.push({ path: stateRelativePath, reason: "从可读 Markdown 协作记录补齐机器状态文件" });
  } else if (report.stateInfo.version !== 1) {
    nextState = {
      ...nextState,
      version: 1,
      lanes: {
        ...(nextState.lanes || {}),
        ...Object.fromEntries(report.lanes.map((lane) => [lane.lane, {
          ...(nextState.lanes?.[lane.lane] || {}),
          ...laneToStateRecord(lane)
        }]))
      }
    };
    actions.push(overwriteFileAction(workspaceRoot, stateRelativePath, renderAgentLanesState(nextState)));
    backupSources.push(stateRelativePath);
    willUpdate.push({ path: stateRelativePath, reason: "补充 version: 1，并保留已有 lanes / requests" });
  }
  if (!report.registry.exists && report.lanes.length) {
    actions.push(fileAction(workspaceRoot, report.collaboration.registry, renderAgentLanesRegistry(report.lanes)));
    willCreate.push({ path: report.collaboration.registry, reason: "从 state.json 补齐人类可读 lane 注册表" });
  } else if (report.registry.exists) {
    backupSources.push(report.collaboration.registry);
    willPreserve.push(report.collaboration.registry);
  }
  if (!fs.existsSync(path.join(workspaceRoot, report.collaboration.shared))) {
    actions.push(fileAction(workspaceRoot, report.collaboration.shared, renderSharedContext(report.shared)));
    willCreate.push({ path: report.collaboration.shared, reason: "补齐共享输出和交接记录索引" });
  } else {
    backupSources.push(report.collaboration.shared);
    willPreserve.push(report.collaboration.shared);
  }
  for (const lane of report.lanes) {
    const worklog = path.join(report.collaboration.root, lane.worklog);
    const workspaceReadme = path.join(report.collaboration.root, lane.workspace, "README.md");
    if (!fs.existsSync(path.join(workspaceRoot, worklog))) {
      actions.push(fileAction(workspaceRoot, worklog, renderLaneWorklog(lane.lane)));
      willCreate.push({ path: worklog, reason: `补齐 ${lane.lane} lane worklog` });
    } else {
      willPreserve.push(worklog);
    }
    if (!fs.existsSync(path.join(workspaceRoot, workspaceReadme))) {
      actions.push(fileAction(workspaceRoot, workspaceReadme, renderLaneWorkspaceReadme(lane.lane, report.collaboration)));
      willCreate.push({ path: workspaceReadme, reason: `补齐 ${lane.lane} lane workspace 说明` });
    } else {
      willPreserve.push(workspaceReadme);
    }
  }
  const uniqueBackupSources = [...new Set(backupSources)].filter((relativePath) => fs.existsSync(path.join(workspaceRoot, relativePath)));
  return {
    workspaceRoot,
    status: report.compatibility.status === "current" ? "current" : "migration_available",
    targetStructureVersion: 1,
    safeToApply,
    compatibility: report.compatibility,
    actions: dedupeActions(actions),
    willCreate,
    willUpdate,
    willCopy: uniqueBackupSources.map((relativePath) => ({ from: relativePath, to: path.join(".starwork", "backups", "multiagent", timestamp, relativePath) })),
    willPreserve: [...new Set(willPreserve)],
    willNotTouch,
    conflicts: report.conflicts,
    warnings: report.warnings,
    backupPath: path.join(".starwork", "backups", "multiagent", timestamp),
    backupSources: uniqueBackupSources,
    reportPath: path.join(".starwork", "agent-lanes", `migration-report-${timestamp}.json`),
    timestamp
  };
}

function normalizeAgentLanesStateData(data = {}) {
  return {
    version: 1,
    lanes: data.lanes && typeof data.lanes === "object" ? data.lanes : {},
    requests: Array.isArray(data.requests) ? data.requests : []
  };
}

function laneToStateRecord(lane) {
  const parsed = parseAdapterSession(lane.current_session || "unbound");
  return {
    current_session: lane.current_session || "unbound",
    host: parsed.host,
    session_id: parsed.id,
    thread_id: parsed.host === "codex" ? parsed.id : null,
    purpose: lane.purpose || "待补充",
    write_scope: lane.write_scope || "待补充",
    worklog: lane.worklog || defaultLaneWorklogPath(lane.lane),
    workspace: lane.workspace || defaultLaneWorkspacePath(lane.lane)
  };
}

function sharedRequestToStateRequest(row) {
  return {
    id: row.id || buildLaneRequestId(row.to || "lane"),
    from: row.from || "user",
    to: row.to || "unknown",
    message_type: "instruction",
    recorded_in: row.link || "",
    host_delivery: {
      status: row.host_delivery || row.status || "recorded_only",
      delivery_tool: "legacy_shared_md",
      mode: "migrated"
    }
  };
}

function renderMultiagentMigrationPlanJson(plan) {
  return {
    status: plan.status,
    target_structure_version: plan.targetStructureVersion,
    safe_to_apply: plan.safeToApply,
    compatibility: plan.compatibility,
    will_create: plan.willCreate,
    will_update: plan.willUpdate,
    will_copy: plan.willCopy,
    will_preserve: plan.willPreserve,
    will_not_touch: plan.willNotTouch,
    conflicts: plan.conflicts,
    warnings: plan.warnings,
    backup: {
      will_create_backup: plan.willCopy.length > 0,
      path: plan.backupPath
    },
    report_path: plan.reportPath
  };
}

function printMultiagentMigrationPlan(plan, dryRun = true) {
  console.log("");
  console.log(dryRun ? "这是一次预览，不会写入文件。" : "MultiAgent 结构迁移计划：");
  console.log("");
  console.log("已识别：");
  for (const source of plan.compatibility.read_sources || []) console.log(`- ${source}`);
  if (!plan.compatibility.read_sources?.length) console.log("- 未发现已有 MultiAgent 协作记录。");
  printMigrationGroup("将会创建：", plan.willCreate.map((item) => `${item.path}：${item.reason}`));
  printMigrationGroup("将会更新：", plan.willUpdate.map((item) => `${item.path}：${item.reason}`));
  printMigrationGroup("将会备份：", plan.willCopy.map((item) => `${item.from} -> ${item.to}`));
  printMigrationGroup("将会保留：", plan.willPreserve);
  printMigrationGroup("不会做：", plan.willNotTouch);
  if (plan.conflicts.length) printMigrationGroup("需要人工处理的冲突：", plan.conflicts);
  if (plan.warnings.length) printMigrationGroup("提醒：", plan.warnings);
}

function printMigrationGroup(title, items) {
  console.log("");
  console.log(title);
  if (!items.length) {
    console.log("- 无");
    return;
  }
  for (const item of items) console.log(`- ${item}`);
}

function applyMultiagentMigrationPlan(plan) {
  const backupRoot = path.join(plan.workspaceRoot, plan.backupPath);
  if (plan.willCopy.length) {
    fs.mkdirSync(backupRoot, { recursive: true });
    for (const relativePath of plan.backupSources) {
      const source = path.join(plan.workspaceRoot, relativePath);
      if (!fs.existsSync(source)) continue;
      const target = path.join(backupRoot, relativePath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);
    }
  }
  applyPlan({ targetDir: plan.workspaceRoot, actions: plan.actions });
  const report = {
    source_version: plan.compatibility.structure_version,
    target_version: plan.targetStructureVersion,
    legacy_classes: plan.compatibility.legacy_classes,
    applied_actions: plan.actions.map((action) => ({
      type: action.type,
      mode: action.mode,
      path: action.relativePath
    })),
    backup_path: plan.willCopy.length ? plan.backupPath : null,
    skipped_actions: plan.willPreserve,
    conflicts_resolved: [],
    conflicts_unresolved: plan.conflicts,
    command_timestamp: new Date().toISOString()
  };
  fs.mkdirSync(path.dirname(path.join(plan.workspaceRoot, plan.reportPath)), { recursive: true });
  fs.writeFileSync(path.join(plan.workspaceRoot, plan.reportPath), `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function printMultiagentCompatibilitySummary(report) {
  if (report.compatibility.status === "current") return;
  console.log("");
  console.log("升级提示：");
  if (report.compatibility.status === "blocked_conflict") {
    console.log("- 检测到旧版 MultiAgent 协作记录存在冲突，暂不能自动迁移。");
  } else if (report.compatibility.status === "unknown_partial") {
    console.log("- 检测到部分旧版 MultiAgent 协作记录，但机器状态可能损坏。");
  } else {
    console.log("- 已检测到旧版 MultiAgent 协作记录，目前可以读取已有 AI 岗位。");
    console.log("- 写入新岗位、绑定会话或记录交接前，建议先预览迁移。预览不会写入文件。");
  }
  console.log(`- 预览命令：${report.compatibility.migration.dry_run_command}`);
}

function parseMarkdownTableSection(content, heading, fields) {
  const lines = content.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim() === heading);
  if (headingIndex === -1) return [];
  const rows = [];
  for (let i = headingIndex + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.startsWith("## ")) break;
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (!cells.length || cells.every((cell) => /^-+$/.test(cell.replace(/\s/g, "")))) continue;
    if (cells[0] === fields[0]) continue;
    const row = {};
    fields.forEach((field, index) => {
      row[field] = cells[index] || "";
    });
    rows.push(row);
  }
  return rows;
}

function renderAgentLanesRegistry(lanes) {
  return `# Agent Lanes

## Lanes

| lane | purpose | current_session | write_scope | worklog | workspace |
|---|---|---|---|---|---|
${lanes.map((rawLane) => {
    const lane = normalizeLaneRecord(rawLane);
    return `| ${escapeMarkdownCell(lane.lane)} | ${escapeMarkdownCell(lane.purpose)} | ${escapeMarkdownCell(lane.current_session || "unbound")} | ${escapeMarkdownCell(lane.write_scope)} | ${escapeMarkdownCell(lane.worklog)} | ${escapeMarkdownCell(lane.workspace)} |`;
  }).join("\n")}
`;
}

function normalizeLaneRecord(lane) {
  return {
    ...lane,
    worklog: lane.worklog || defaultLaneWorklogPath(lane.lane),
    workspace: lane.workspace || defaultLaneWorkspacePath(lane.lane)
  };
}

function defaultLaneWorklogPath(laneId) {
  return path.posix.join("lanes", laneId, "worklog.md");
}

function defaultLaneWorkspacePath(laneId) {
  return path.posix.join("lanes", laneId, "workspace");
}

function renderSharedContext(shared) {
  return `# Shared Agent Context

## Shared Outputs

| from | title | path | audience | status | updated |
|---|---|---|---|---|---|
${shared.outputs.map((row) => `| ${escapeMarkdownCell(row.from)} | ${escapeMarkdownCell(row.title)} | ${escapeMarkdownCell(row.path)} | ${escapeMarkdownCell(row.audience)} | ${escapeMarkdownCell(row.status)} | ${escapeMarkdownCell(row.updated)} |`).join("\n")}

## Cross-Lane Requests

| id | from | to | request | status | host_delivery | link | updated |
|---|---|---|---|---|---|---|---|
${shared.requests.map((row) => `| ${escapeMarkdownCell(row.id)} | ${escapeMarkdownCell(row.from)} | ${escapeMarkdownCell(row.to)} | ${escapeMarkdownCell(row.request)} | ${escapeMarkdownCell(row.status)} | ${escapeMarkdownCell(row.host_delivery)} | ${escapeMarkdownCell(row.link)} | ${escapeMarkdownCell(row.updated)} |`).join("\n")}

## Shared Agreements

| agreement | owner | status | link |
|---|---|---|---|
${shared.agreements.map((row) => `| ${escapeMarkdownCell(row.agreement)} | ${escapeMarkdownCell(row.owner)} | ${escapeMarkdownCell(row.status)} | ${escapeMarkdownCell(row.link)} |`).join("\n")}
`;
}

function renderLaneWorklog(laneId) {
  const title = laneId.split(/[-_]/).filter(Boolean).map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`).join(" ") || "Lane";
  return `# ${title} Worklog

## Current

待补充。

## Outputs

| title | path | audience | status |
|---|---|---|---|

## Requests

| to | request | status | link |
|---|---|---|---|

## Notes

待补充。

## Next

待补充。
`;
}

function renderLaneWorkspaceReadme(laneId, collaboration = { shared: path.join("_系统", "协作", "shared.md") }) {
  const title = laneId.split(/[-_]/).filter(Boolean).map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`).join(" ") || "Lane";
  return `# ${title} Workspace

这里存放该 lane 的过程材料、草稿、分析记录和临时产物。

## 边界

- 这是过程工作区，不是项目正式输出目录。
- 需要其他 lane 读取的材料，应通过 \`${collaboration.shared}\` 登记。
- 成熟产物应晋升到项目正式事实源，例如 \`product/\`、\`输出/确认成果/\` 或项目约定的正式输出目录。
`;
}

function renderMultiagentLaunchMessage({ lane, fromLane, workspaceRoot, collaboration }) {
  return `<!-- STARWORK:MULTIAGENT_MESSAGE v1 -->

# StarWork MultiAgent Launch

message_type: launch
from_lane: ${fromLane}
to_lane: ${lane.lane}
workspace: ${workspaceRoot}
created_at: ${new Date().toISOString()}

## 你的职责

${lane.purpose}

## 你可以主动修改的范围

${lane.write_scope}

## 你启动后必须先读取

1. AGENTS.md
2. ${collaboration.registry}
3. ${path.posix.join(collaboration.root.replace(/\\/g, "/"), lane.worklog)}
4. ${collaboration.shared}

## 当前要求

请先完成初始化阅读，确认你已经理解自己的 lane 职责和写入边界。
除非后续收到明确指令，否则不要主动修改项目文件。

## 回报方式

完成初始化后，在本会话回复一句：

已进入 ${lane.lane} lane，等待下一步指令。

<!-- /STARWORK:MULTIAGENT_MESSAGE -->
`;
}

function renderMultiagentInstructionMessage({ requestId, fromLane, toLane, message, collaboration, targetLane, workspaceRoot }) {
  return `<!-- STARWORK:MULTIAGENT_MESSAGE v1 -->

# StarWork MultiAgent Instruction

message_type: instruction
request_id: ${requestId}
from_lane: ${fromLane}
to_lane: ${toLane}
created_at: ${new Date().toISOString()}
recorded_in: ${collaboration.shared}

## 消息内容

${message}

## 边界

- 只在你的 write_scope 内主动修改：${targetLane.write_scope}
- 如需修改 write_scope 之外的文件，先在 ${collaboration.shared} 记录请求或在回复中说明需要授权。
- 不要修改与本任务无关的文件。
- 当前工作区：${workspaceRoot}

## 完成后请回报

1. 更新你的 lane worklog：${path.posix.join(collaboration.root.replace(/\\/g, "/"), targetLane.worklog)}
2. 如有正式输出，登记到 ${collaboration.shared} 的 Shared Outputs。
3. 如需验收，向 ${fromLane} 发送回传指令或在回复中明确说明。

<!-- /STARWORK:MULTIAGENT_MESSAGE -->
`;
}

function buildMultiagentInstructionPayload({ workspaceRoot, toLane, fromLane, text, requestId = "" }) {
  const state = readWorkspaceState(workspaceRoot);
  const collaboration = getCollaborationPaths(state);
  const registry = readLanesRegistry(workspaceRoot);
  const targetLane = findLaneOrThrow(registry.lanes, toLane);
  if (fromLane !== "user") findLaneOrThrow(registry.lanes, fromLane);
  const resolvedRequestId = normalizeMarkdownCell(requestId || buildLaneRequestId(toLane));
  return {
    requestId: resolvedRequestId,
    fromLane,
    toLane,
    targetLane,
    collaboration,
    message: renderMultiagentInstructionMessage({
      requestId: resolvedRequestId,
      fromLane,
      toLane,
      message: text,
      collaboration,
      targetLane,
      workspaceRoot
    })
  };
}

function parseLaneList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => normalizeLaneId(item, "lanes"));
}

function buildLaneLaunchSessionName({ lane, workspaceRoot, explicitName }) {
  const requestedName = normalizeMarkdownCell(explicitName || "");
  if (requestedName) return sanitizeLaneSessionName(requestedName);
  const roleName = deriveLaneRoleName(lane);
  return normalizeMarkdownCell(`${roleName || "Agent"} Agent`);
}

function deriveLaneRoleName(lane) {
  const fallback = humanizeLaneId(lane?.lane || "agent");
  const purpose = normalizeMarkdownCell(lane?.purpose || "");
  if (/^(根据|只负责|用于)\s*/u.test(purpose)) {
    return sanitizeLaneRoleName(fallback);
  }
  let roleName = purpose;
  roleName = roleName.split(/[:：。；;，,、\n\r]/)[0].trim();
  roleName = roleName.replace(/^(只负责|主要负责|负责|用于|协助|根据)\s*/u, "").trim();
  if (!roleName || /^根据\s*/u.test(roleName) || /^(SPEC|spec|需求|任务)\b/.test(roleName)) {
    roleName = fallback;
  }
  roleName = roleName.replace(/^(生成|实现|维护|处理)\s+/u, "").trim() || fallback;
  return sanitizeLaneRoleName(roleName);
}

function humanizeLaneId(laneId) {
  const normalized = normalizeMarkdownCell(laneId || "agent");
  const parts = normalized.split(/[-_]+/).filter(Boolean);
  if (!parts.length) return "Agent";
  return parts.map((part) => {
    if (/^[a-z]+$/i.test(part)) return `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`;
    return part;
  }).join(" ");
}

function sanitizeLaneRoleName(value) {
  const sanitized = normalizeMarkdownCell(value)
    .replace(/[:：。；;，,、\n\r].*$/u, "")
    .replace(/\s+/g, " ")
    .trim();
  return sanitized.slice(0, 24).trim() || "Agent";
}

function sanitizeLaneSessionName(value) {
  const sanitized = normalizeMarkdownCell(value)
    .replace(/[\n\r]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return sanitized.slice(0, 40).trim();
}

function resolveLaneLaunchHost({ options, lanes, workspaceRoot }) {
  const explicit = typeof options.host === "string" ? options.host : (options.agent || options.adapter || "");
  if (explicit) return normalizeAdapterHost(explicit);
  const boundHosts = new Set(lanes
    .map((lane) => parseAdapterSession(lane.current_session).host)
    .filter((host) => host && host !== "none" && host !== "manual"));
  if (boundHosts.size === 1) return [...boundHosts][0];
  const adaptersState = readAdaptersState(workspaceRoot);
  const enabledHosts = Object.entries(adaptersState.adapters || {})
    .filter(([, record]) => record?.enabled)
    .map(([host]) => normalizeAdapterHost(host));
  if (enabledHosts.length === 1) return enabledHosts[0];
  return "codex";
}

function buildManualHostLaunchResult({ lane, host, sessionName, dryRun, message }) {
  const label = host === "trae" ? "Trae" : (host === "cursor" ? "Cursor" : host);
  const status = dryRun ? "manual_handoff_required" : "manual_handoff_required";
  return {
    lane: lane.lane,
    dry_run: dryRun,
    session_name: sessionName,
    launch_status: status,
    rename_status: "unsupported",
    binding_status: "unbound",
    host,
    message,
    instructions: `${label} host session launch is not adapted. Open ${label} manually, paste the launch message, then bind the lane to a real session id if needed.`,
    warning: `${label} launch/create-chat is not supported by StarWork CLI.`
  };
}

function assertAgentDocsReadyForMultiagent(workspaceRoot) {
  const adaptersState = readAdaptersState(workspaceRoot);
  const pendingHosts = Object.entries(adaptersState.adapters || {})
    .filter(([, record]) => record?.rules_entry_status === "pending_merge")
    .map(([host, record]) => `${host}${record.draft_entry ? ` (${record.draft_entry})` : ""}`);
  if (pendingHosts.length) {
    throw new Error(`AI 入口文档仍处于 pending_merge：${pendingHosts.join("、")}。请先使用 starworkInit 整合入口文档，再继续 multiagent init/add/bind/launch。`);
  }
}

function normalizeLaneId(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} 必须是非空 lane ID。`);
  }
  const laneId = value.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(laneId)) {
    throw new Error(`${label} 只能包含字母、数字、短横线和下划线：${value}`);
  }
  return laneId;
}

function findLaneOrThrow(lanes, laneId) {
  const lane = lanes.find((item) => item.lane === laneId);
  if (!lane) {
    throw new Error(`找不到 Lane：${laneId}`);
  }
  return lane;
}

function resolveLaneSession(options) {
  if (options.session) {
    return normalizeHostSession(options.session, options.agent);
  }
  const agent = options.agent || "codex";
  const normalizedAgent = normalizeAdapterHost(agent);
  if (normalizedAgent === "codex" && process.env.CODEX_THREAD_ID) {
    return `codex:${process.env.CODEX_THREAD_ID}`;
  }
  if (normalizedAgent === "claude-code" && process.env.CLAUDE_CODE_SESSION_ID) {
    return `claude-code:${process.env.CLAUDE_CODE_SESSION_ID}`;
  }
  throw new Error("无法自动识别当前会话。请传入 --session <agent:session-id>。");
}

function normalizeAdapterHost(value) {
  const raw = normalizeMarkdownCell(value || "manual").toLowerCase();
  if (raw === "manual" || raw === "none" || raw === "unbound") return raw;
  return ADAPTER_ALIASES[raw] || raw;
}

function normalizeHostSession(session, fallbackHost) {
  const normalized = normalizeMarkdownCell(session);
  if (!normalized || normalized === "unbound") return "unbound";
  if (normalized.includes(":")) {
    const [hostRaw, ...rest] = normalized.split(":");
    const host = normalizeAdapterHost(hostRaw);
    const id = rest.join(":").trim();
    if (!id) throw new Error(`session id 不能为空：${session}`);
    return `${host}:${id}`;
  }
  const host = normalizeAdapterHost(fallbackHost || "manual");
  if (host === "manual") return normalized;
  return `${host}:${normalized}`;
}

function parseAdapterSession(session, fallbackHost) {
  const normalized = normalizeHostSession(session || "unbound", fallbackHost);
  if (!normalized || normalized === "unbound") {
    return { host: "none", id: null, session: "unbound" };
  }
  if (!normalized.includes(":")) {
    return { host: normalizeAdapterHost(fallbackHost || "manual"), id: normalized, session: normalized };
  }
  const [hostRaw, ...rest] = normalized.split(":");
  const host = normalizeAdapterHost(hostRaw);
  const id = rest.join(":").trim();
  return { host, id: id || null, session: normalized };
}

async function observeHostSession(session, options = {}) {
  const parsed = parseAdapterSession(session);
  if (parsed.host === "none") {
    return {
      adapter: "none",
      readable: false,
      status: "unbound",
      warning: "Lane has no host session binding",
      ui_visibility: "not_guaranteed"
    };
  }
  if (parsed.host === "codex") {
    return observeManualHostSession(parsed, {
      status: "use_starworkMultiagent_tool",
      warning: "Codex lane reading must be performed by starworkMultiagent with read_thread in the Codex App; CLI only reports the StarWork binding."
    });
  }
  if (parsed.host === "claude-code") {
    return observeClaudeCodeSession(parsed, options);
  }
  if (parsed.host === "cursor") {
    return observeCursorSession(parsed, options);
  }
  if (parsed.host === "trae") {
    return observeTraeManualHostSession(parsed, options);
  }
  return observeManualHostSession(parsed, {
    status: "manual",
    warning: "当前宿主不支持自动观察，请以 lane worklog 和 shared context 为准。"
  });
}

function observeManualHostSession(parsed, details = {}) {
  return {
    adapter: parsed.host,
    session_id: parsed.id,
    readable: false,
    status: details.status || "manual",
    warning: details.warning || "Manual handoff required",
    ui_visibility: "not_guaranteed"
  };
}

function observeTraeManualHostSession(parsed, options = {}) {
  const status = options.command === "status" ? "manual_host" : MANUAL_HANDOFF_STATUS;
  return {
    adapter: "trae",
    session_id: parsed.id,
    readable: false,
    status,
    message: "Trae host session automation is not adapted. Use StarWork worklog/shared context and manual UI operation.",
    warning: "Trae is a manual-operation host; StarWork does not read Trae database.db, state.vscdb, or private session storage.",
    ui_visibility: "not_guaranteed"
  };
}

function observeCursorSession(parsed, options = {}) {
  const workspaceRoot = options.workspaceRoot || process.cwd();
  const base = buildCursorHostFacts({ workspaceRoot, sessionId: parsed.id, transcriptPath: options.transcriptPath, command: options.command });
  if (!parsed.id) {
    return {
      ...base,
      adapter: "cursor",
      session_id: parsed.id,
      readable: false,
      status: "not_found",
      warning: "Cursor lane is missing a session id."
    };
  }
  const transcriptPath = base.transcript_path_absolute;
  if (!transcriptPath) {
    return {
      ...withoutInternalCursorFields(base),
      adapter: "cursor",
      session_id: parsed.id,
      readable: false,
      status: "not_found",
      warning: "Cursor transcript not found. StarWork only reads agent-transcripts/<uuid>/<uuid>.jsonl."
    };
  }
  try {
    fs.accessSync(transcriptPath, fs.constants.R_OK);
  } catch (error) {
    return {
      ...withoutInternalCursorFields(base),
      adapter: "cursor",
      session_id: parsed.id,
      readable: false,
      status: "unreadable",
      transcript_path: transcriptPath,
      warning: `Cursor transcript exists but is unreadable: ${error.message}`
    };
  }
  try {
    const summary = readCursorTranscriptSummary(transcriptPath);
    return {
      ...withoutInternalCursorFields(base),
      adapter: "cursor",
      session_id: parsed.id,
      readable: summary.status !== "not_found",
      status: summary.status,
      transcript_path: transcriptPath,
      line_count: summary.line_count,
      bad_line_count: summary.bad_line_count,
      first_user_query: summary.first_user_query,
      last_user_query: summary.last_user_query,
      tool_names: summary.tool_names,
      candidate_outputs: summary.candidate_outputs,
      warning: summary.warning
    };
  } catch (error) {
    return {
      ...withoutInternalCursorFields(base),
      adapter: "cursor",
      session_id: parsed.id,
      readable: false,
      status: "unreadable",
      transcript_path: transcriptPath,
      warning: `Cursor transcript could not be summarized: ${error.message}`
    };
  }
}

function buildCursorHostFacts({ workspaceRoot, sessionId, transcriptPath, command }) {
  const adaptersState = readAdaptersState(workspaceRoot);
  const transcriptRoot = resolveCursorProjectsDir(transcriptPath);
  const resolvedTranscriptPath = resolveCursorTranscriptPath(sessionId, transcriptPath);
  return {
    adapter_enabled: Boolean(adaptersState.adapters?.cursor?.enabled),
    rules_entry_exists: fs.existsSync(path.join(workspaceRoot, ".cursor", "rules", "starwork.mdc")),
    skills_dir_exists: fs.existsSync(path.join(workspaceRoot, ".cursor", "skills")),
    transcript_root: transcriptRoot,
    transcript_root_exists: Boolean(transcriptRoot && fs.existsSync(transcriptRoot)),
    bound_transcript_exists: Boolean(resolvedTranscriptPath && fs.existsSync(resolvedTranscriptPath)),
    transcript_path_absolute: resolvedTranscriptPath,
    cursor_cli_exists: commandExistsOnPath("cursor"),
    cursor_agent_status: command === "status" ? probeCursorAgentStatus() : "not_checked",
    cursor_api_key_present: Boolean(process.env.CURSOR_API_KEY)
  };
}

function probeCursorAgentStatus() {
  if (!commandExistsOnPath("cursor")) return "not_found";
  const result = spawnSync("cursor", ["agent", "status"], {
    encoding: "utf8",
    timeout: 3000,
    maxBuffer: 64 * 1024
  });
  if (result.error) {
    return result.error.code === "ETIMEDOUT" ? "timeout" : "error";
  }
  const text = `${result.stdout || ""}\n${result.stderr || ""}`;
  const parsed = parseCursorAgentStatusText(text);
  if (result.status && result.status !== 0) return parsed === "unknown" ? "error" : parsed;
  return parsed;
}

function parseCursorAgentStatusText(text) {
  const normalized = String(text || "").toLowerCase();
  if (/not\s+logged\s+in|not\s+authenticated|login\s+required|signed\s+out/.test(normalized)) {
    return "not_logged_in";
  }
  if (/logged\s+in|authenticated|signed\s+in/.test(normalized)) {
    return "logged_in";
  }
  return "unknown";
}

function withoutInternalCursorFields(facts) {
  const { transcript_path_absolute, ...publicFacts } = facts;
  return publicFacts;
}

function resolveCursorProjectsDir(explicitPath) {
  if (explicitPath) {
    const absolute = path.resolve(expandHomePath(explicitPath));
    if (!fs.existsSync(absolute)) return absolute;
    if (fs.statSync(absolute).isFile()) return path.dirname(path.dirname(path.dirname(absolute)));
    return absolute;
  }
  if (process.env.STARWORK_CURSOR_PROJECTS_DIR) {
    return path.resolve(expandHomePath(process.env.STARWORK_CURSOR_PROJECTS_DIR));
  }
  const home = process.env.HOME || process.env.USERPROFILE;
  return home ? path.join(home, ".cursor", "projects") : null;
}

function resolveCursorTranscriptPath(sessionId, explicitPath) {
  if (!sessionId) return null;
  if (explicitPath) {
    const absolute = path.resolve(expandHomePath(explicitPath));
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) return absolute;
    return findCursorTranscriptInRoot(absolute, sessionId);
  }
  const projectsDir = resolveCursorProjectsDir();
  return projectsDir ? findCursorTranscriptInRoot(projectsDir, sessionId) : null;
}

function findCursorTranscriptInRoot(root, sessionId) {
  if (!root || !fs.existsSync(root)) return null;
  const directCandidates = [
    path.join(root, "agent-transcripts", sessionId, `${sessionId}.jsonl`),
    path.join(root, sessionId, `${sessionId}.jsonl`),
    path.join(root, `${sessionId}.jsonl`)
  ];
  for (const candidate of directCandidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  const stat = fs.statSync(root);
  if (!stat.isDirectory()) return null;
  for (const projectKey of fs.readdirSync(root).sort()) {
    const candidate = path.join(root, projectKey, "agent-transcripts", sessionId, `${sessionId}.jsonl`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function expandHomePath(value) {
  const raw = String(value || "");
  if (raw === "~") return process.env.HOME || process.env.USERPROFILE || raw;
  if (raw.startsWith("~/")) {
    const home = process.env.HOME || process.env.USERPROFILE;
    return home ? path.join(home, raw.slice(2)) : raw;
  }
  return raw;
}

function readCursorTranscriptSummary(transcriptPath) {
  const lines = fs.readFileSync(transcriptPath, "utf8").split(/\r?\n/).filter((line) => line.trim());
  const userQueries = [];
  const toolNames = new Set();
  const candidateOutputs = new Set();
  let badLineCount = 0;
  for (const line of lines) {
    let payload;
    try {
      payload = JSON.parse(line);
    } catch {
      badLineCount += 1;
      continue;
    }
    const role = normalizeCursorTranscriptRole(payload);
    const text = extractTranscriptText(payload.text || payload.content || payload.message?.content || payload.summary || payload.data?.text);
    if (role === "user" && text) userQueries.push(text.slice(0, 500));
    const toolName = extractCursorToolName(payload);
    if (toolName) toolNames.add(toolName);
    for (const candidate of extractCandidateOutputPaths(payload)) {
      candidateOutputs.add(candidate);
    }
  }
  const parsedCount = lines.length - badLineCount;
  const status = badLineCount > 0 ? "malformed_partial" : "transcript_observed";
  return {
    status,
    line_count: lines.length,
    bad_line_count: badLineCount,
    first_user_query: userQueries[0] || null,
    last_user_query: userQueries[userQueries.length - 1] || null,
    tool_names: [...toolNames].sort(),
    candidate_outputs: [...candidateOutputs].sort(),
    warning: badLineCount > 0
      ? `Cursor transcript 有 ${badLineCount} 行坏行，已跳过；StarWork worklog/shared 仍是事实源。`
      : "Cursor transcript is incomplete host observation; StarWork worklog/shared remain the source of truth.",
    parsed_count: parsedCount
  };
}

function normalizeCursorTranscriptRole(payload) {
  const raw = String(payload.role || payload.type || payload.message?.role || payload.event?.role || "").toLowerCase();
  if (raw.includes("user")) return "user";
  if (raw.includes("assistant")) return "assistant";
  if (raw.includes("tool")) return "tool";
  return raw || "unknown";
}

function extractCursorToolName(payload) {
  const candidates = [
    payload.name,
    payload.tool_name,
    payload.toolName,
    payload.function?.name,
    payload.call?.name,
    payload.data?.name
  ];
  return candidates.find((candidate) => typeof candidate === "string" && candidate.trim())?.trim() || null;
}

function extractCandidateOutputPaths(value, results = new Set()) {
  if (!value) return results;
  if (typeof value === "string") {
    const matches = value.match(/\b(?:product|docs|_系统|\.starwork|src|cli)\/[A-Za-z0-9._/@+-]+(?:\/[A-Za-z0-9._/@+-]+)*/g) || [];
    matches.forEach((match) => {
      if (!match.includes("node_modules")) results.add(match);
    });
    return results;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => extractCandidateOutputPaths(item, results));
    return results;
  }
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (key === "patch" || key === "diff") continue;
      if (["path", "file", "filePath", "filepath", "relative_path", "output_path"].includes(key) && typeof nested === "string") {
        results.add(nested);
        continue;
      }
      extractCandidateOutputPaths(nested, results);
    }
  }
  return results;
}

function observeClaudeCodeSession(parsed, options = {}) {
  const transcriptPath = resolveClaudeTranscriptPath(parsed.id, options.transcriptPath);
  const base = {
    adapter: "claude-code",
    session_id: parsed.id,
    readable: false,
    status: "manual",
    continue_command: `claude --resume ${parsed.id}`,
    ui_visibility: "not_guaranteed"
  };
  if (!transcriptPath) {
    return {
      ...base,
      warning: "未提供 Claude Code transcript 路径；可用 --transcript <jsonl-or-dir> 做只读摘要。"
    };
  }
  try {
    const summary = readClaudeTranscriptSummary(transcriptPath, { turnLimit: options.turnLimit || 0 });
    return {
      ...base,
      readable: true,
      status: "observed",
      transcript_path: transcriptPath,
      turn_count: summary.turn_count,
      turns: summary.turns,
      warning: summary.warning
    };
  } catch (error) {
    return {
      ...base,
      transcript_path: transcriptPath,
      warning: `无法读取 Claude Code transcript：${error.message}`
    };
  }
}

function resolveClaudeTranscriptPath(sessionId, explicitPath) {
  if (explicitPath) return path.resolve(explicitPath);
  if (process.env.STARWORK_CLAUDE_TRANSCRIPT_PATH) return path.resolve(process.env.STARWORK_CLAUDE_TRANSCRIPT_PATH);
  if (process.env.STARWORK_CLAUDE_TRANSCRIPT_DIR) {
    const dir = path.resolve(process.env.STARWORK_CLAUDE_TRANSCRIPT_DIR);
    const candidates = [
      path.join(dir, `${sessionId}.jsonl`),
      path.join(dir, sessionId, "transcript.jsonl"),
      path.join(dir, sessionId)
    ];
    return candidates.find((candidate) => fs.existsSync(candidate)) || path.join(dir, `${sessionId}.jsonl`);
  }
  return null;
}

function readClaudeTranscriptSummary(transcriptPath, options = {}) {
  const files = collectClaudeTranscriptFiles(transcriptPath);
  const entries = [];
  for (const file of files) {
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter((line) => line.trim());
    for (let index = 0; index < lines.length; index += 1) {
      const entry = summarizeClaudeTranscriptLine(lines[index], `${path.basename(file)}:${index + 1}`);
      if (entry) entries.push(entry);
    }
  }
  const turnLimit = Number(options.turnLimit || 0);
  const turns = turnLimit > 0 ? entries.slice(-turnLimit) : entries.slice(-5);
  return {
    turn_count: entries.length,
    turns,
    warning: entries.length ? null : "transcript 中没有可摘要的 JSONL 记录"
  };
}

function collectClaudeTranscriptFiles(transcriptPath) {
  if (!fs.existsSync(transcriptPath)) {
    throw new Error(`路径不存在：${transcriptPath}`);
  }
  const stat = fs.statSync(transcriptPath);
  if (stat.isFile()) return [transcriptPath];
  if (!stat.isDirectory()) throw new Error(`不是文件或目录：${transcriptPath}`);
  const files = fs.readdirSync(transcriptPath)
    .filter((name) => name.endsWith(".jsonl"))
    .sort()
    .map((name) => path.join(transcriptPath, name));
  if (!files.length) throw new Error(`目录中没有 .jsonl transcript：${transcriptPath}`);
  return files;
}

function summarizeClaudeTranscriptLine(line, id) {
  let payload;
  try {
    payload = JSON.parse(line);
  } catch {
    return null;
  }
  const role = payload.role || payload.type || payload.message?.role || payload.event?.role || "unknown";
  const content = extractTranscriptText(payload.content || payload.message?.content || payload.text || payload.summary || payload.event?.content);
  return {
    id: payload.uuid || payload.id || id,
    role,
    summary: content ? content.slice(0, 180) : ""
  };
}

function extractTranscriptText(value) {
  if (!value) return "";
  if (typeof value === "string") return value.replace(/\s+/g, " ").trim();
  if (Array.isArray(value)) return value.map((item) => extractTranscriptText(item?.text || item?.content || item)).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (typeof value === "object") return extractTranscriptText(value.text || value.content || value.value);
  return "";
}

function commandExistsOnPath(command) {
  const pathEnv = process.env.PATH || "";
  const extensions = process.platform === "win32" ? ["", ".cmd", ".exe", ".bat"] : [""];
  return pathEnv.split(path.delimiter).filter(Boolean).some((dir) => extensions.some((extension) => {
    const candidate = path.join(dir, `${command}${extension}`);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }));
}

function createManualHandoffDelivery({ parsedSession, message, reason }) {
  return {
    adapter: parsedSession.host,
    status: MANUAL_HANDOFF_STATUS,
    mode: "manual_handoff",
    session: parsedSession.session,
    session_id: parsedSession.id,
    formatted_message: message,
    warning: reason || "Manual handoff required"
  };
}

function resolveHostRuntimeCapability({ workspaceRoot, parsedSession, command }) {
  if (!parsedSession?.id || parsedSession.host === "none") {
    return {
      host: parsedSession?.host || "none",
      session: parsedSession?.session || "unbound",
      command,
      status: "unbound",
      action: "none",
      warning: "Target lane is not bound to a host session."
    };
  }
  let profile = null;
  try {
    profile = loadAdapterProfile(parsedSession.host);
  } catch (error) {
    return {
      host: parsedSession.host,
      session: parsedSession.session,
      command,
      status: "unsupported",
      action: "none",
      warning: error.message
    };
  }
  const adaptersState = readAdaptersState(workspaceRoot);
  const adapterRecord = adaptersState.adapters?.[profile.host] || null;
  const adapterEnabled = Boolean(adapterRecord?.enabled);
  if (profile.host === "trae") {
    return {
      host: profile.host,
      session: parsedSession.session,
      command,
      profile_level: profile.sessions?.send_message || "manual",
      adapter_enabled: adapterEnabled,
      runtime_available: false,
      status: MANUAL_HANDOFF_STATUS,
      action: "manual_handoff",
      warning: "Trae host session automation is not adapted. Use manual UI operation."
    };
  }
  if (profile.host !== "codex" && !adapterEnabled) {
    return {
      host: profile.host,
      session: parsedSession.session,
      command,
      profile_level: profile.sessions?.send_message || "unknown",
      adapter_enabled: false,
      status: "needs_adapt",
      action: "none",
      warning: `Target host is not adapted. Run starwork adapt ${profile.host} --target <path> --dry-run before automatic routing.`
    };
  }
  const profileLevel = profile.sessions?.send_message || "unknown";
  if (profileLevel === "unsupported") {
    return {
      host: profile.host,
      session: parsedSession.session,
      command,
      profile_level: profileLevel,
      adapter_enabled: adapterEnabled,
      status: "unsupported",
      action: "none",
      warning: `${profile.label} does not support background message delivery.`
    };
  }
  const runtime = probeHostStandardSendCapability(profile.host);
  if (runtime.available) {
    return {
      host: profile.host,
      session: parsedSession.session,
      command,
      profile_level: profileLevel,
      adapter_enabled: adapterEnabled,
      runtime_available: true,
      status: "delivered",
      action: "auto_send",
      mode: runtime.mode
    };
  }
  return {
    host: profile.host,
    session: parsedSession.session,
    command,
    profile_level: profileLevel,
    adapter_enabled: adapterEnabled,
    runtime_available: false,
    status: MANUAL_HANDOFF_STATUS,
    action: "manual_handoff",
    warning: runtime.warning || `${profile.label} standard background delivery capability is not available in this CLI runtime.`
  };
}

function probeHostStandardSendCapability(host) {
  return {
    host,
    available: false,
    mode: null,
    warning: host === "codex"
      ? "Codex delivery must be performed by starworkMultiagent with send_message_to_thread in the Codex App; CLI only records state and manual fallback."
      : `${host} standard background delivery capability is not available in this CLI runtime; low-level turn APIs are not used for multiagent instruct.`
  };
}

function renderHostRoute(route) {
  return {
    id: route.host,
    session: route.session,
    command: route.command,
    profile_level: route.profile_level,
    adapter_enabled: route.adapter_enabled,
    runtime_available: route.runtime_available,
    action: route.action,
    status: route.status,
    warning: route.warning || null
  };
}

function createDeliveryFromRoute({ route, parsedSession, message, workspaceRoot }) {
  if (route.status === MANUAL_HANDOFF_STATUS) {
    return createManualHandoffDelivery({
      parsedSession,
      message,
      reason: route.warning || "Target host requires manual handoff."
    });
  }
  return {
    adapter: route.host || parsedSession.host,
    status: route.status,
    mode: route.action || "none",
    session: parsedSession.session,
    session_id: parsedSession.id,
    message_path: path.relative(workspaceRoot, path.join(workspaceRoot, "_系统", "协作", "shared.md")) || "_系统/协作/shared.md",
    warning: route.warning || null
  };
}

function buildHostContinueResult(parsedSession) {
  if (parsedSession.host === "claude-code" && parsedSession.id) {
    return {
      adapter: parsedSession.host,
      status: "manual_command",
      command: `claude --resume ${parsedSession.id}`,
      instructions: "在 Claude Code 里执行该命令继续这个 lane；StarWork 不会写 Claude 私有 transcript。"
    };
  }
  if (parsedSession.host === "codex" && parsedSession.id) {
    return {
      adapter: parsedSession.host,
      status: "use_multiagent_read_or_instruct",
      instructions: "Codex lane 继续由 read / instruct / launch 管理，v0.1 不新增 continue 命令。"
    };
  }
  if (parsedSession.host === "cursor") {
    return {
      adapter: parsedSession.host,
      status: "manual_handoff_required",
      instructions: "在 Cursor 中打开当前项目，并把 handoff message 复制给目标会话。"
    };
  }
  if (parsedSession.host === "trae") {
    return {
      adapter: parsedSession.host,
      status: "manual_handoff_required",
      instructions: "在 Trae 中打开当前项目，并按 lane worklog / shared context 手动继续。"
    };
  }
  return {
    adapter: parsedSession.host,
    status: "unbound",
    instructions: "该 lane 尚未绑定可继续的宿主会话。"
  };
}

function updateAgentLaneHostState(state, laneId, hostPatch) {
  return {
    ...state,
    lanes: {
      ...(state.lanes || {}),
      [laneId]: {
        ...((state.lanes || {})[laneId] || {}),
        ...hostPatch
      }
    }
  };
}

function renderLanesBindResult({ workspaceRoot, laneId, session, dryRun, sessionNameSync, pinSync }) {
  return {
    schema: "starwork.agent_lanes.bind_result.v0.1",
    target: workspaceRoot,
    lane: laneId,
    session,
    dry_run: Boolean(dryRun),
    session_name_sync: sessionNameSync,
    pin_sync: pinSync || createHostPinResult({ requested: false, supported: false, status: "not_requested" })
  };
}

function createSessionNameSyncResult({ requested, supported, status, name = "", warning = null }) {
  return {
    requested: Boolean(requested),
    supported,
    status,
    name: name || null,
    warning: warning || null
  };
}

function createSessionNameRecordOnlyResult({ sessionName }) {
  const requested = Boolean(sessionName);
  return createSessionNameSyncResult({
    requested,
    supported: false,
    status: requested ? "requires_starworkMultiagent_tool" : "not_requested",
    name: sessionName,
    warning: requested ? "Codex host title changes must be performed by starworkMultiagent with set_thread_title; CLI bind only records StarWork state." : null
  });
}

function printSessionNameSyncResult(result) {
  if (!result.requested) return;
  if (result.status === "ok") {
    console.log(`宿主会话已重命名为：${result.name}`);
    return;
  }
  if (result.warning) {
    console.log(`Warning: session name sync failed: ${result.warning}`);
  }
}

function createHostPinResult({ requested, supported, status, warning = null }) {
  return {
    requested: Boolean(requested),
    supported,
    status,
    warning: warning || null
  };
}

function createHostPinRecordOnlyResult({ requested }) {
  return createHostPinResult({
    requested: Boolean(requested),
    supported: false,
    status: requested ? "requires_starworkMultiagent_tool" : "not_requested",
    warning: requested ? "Codex host pinning must be performed by starworkMultiagent with set_thread_pinned; CLI bind only records StarWork state." : null
  });
}

function pinHostThreadBestEffort({ session, requested }) {
  if (!requested) {
    return createHostPinResult({ requested: false, supported: false, status: "not_requested" });
  }
  const threadId = extractCodexThreadId(session);
  if (!threadId) {
    return createHostPinResult({
      requested: true,
      supported: false,
      status: "skipped",
      warning: "Current session adapter does not support pinning"
    });
  }
  return createHostPinResult({
    requested: true,
    supported: false,
    status: "unsupported",
    warning: "Codex app-server pin method is not stable in this StarWork version"
  });
}

function printHostPinResult(result) {
  if (!result.requested) return;
  if (result.status === "ok") {
    console.log("宿主 thread 已置顶。");
  } else if (result.warning) {
    console.log(`Warning: host thread pin skipped: ${result.warning}`);
  }
}

async function renameHostSessionBestEffort({ session, sessionName }) {
  if (!sessionName) {
    return createSessionNameSyncResult({
      requested: false,
      supported: false,
      status: "not_requested"
    });
  }
  const threadId = extractCodexThreadId(session);
  if (!threadId) {
    return createSessionNameSyncResult({
      requested: true,
      supported: false,
      status: "skipped",
      name: sessionName,
      warning: "Current session adapter does not support host session naming"
    });
  }
  return renameCodexThreadBestEffort({ threadId, sessionName });
}

function extractCodexThreadId(session) {
  const normalizedSession = normalizeMarkdownCell(session);
  if (normalizedSession.startsWith("codex:")) {
    return normalizedSession.slice("codex:".length);
  }
  return null;
}

async function renameCodexThreadBestEffort({ threadId, sessionName }) {
  const result = await runCodexAppServer([
    codexInitializeMessage(1),
    {
      jsonrpc: "2.0",
      id: 2,
      method: "thread/name/set",
      params: {
        threadId,
        name: sessionName
      }
    }
  ], { timeout: 5000 });
  if (!result.ok) {
    return createSessionNameSyncResult({
      requested: true,
      supported: true,
      status: "warning",
      name: sessionName,
      warning: result.warning
    });
  }
  const response = result.responses.find((message) => message.id === 2);
  if (!response || response.error) {
    return createSessionNameSyncResult({
      requested: true,
      supported: true,
      status: "warning",
      name: sessionName,
      warning: response?.error?.message || "Codex app-server did not confirm thread/name/set"
    });
  }
  return createSessionNameSyncResult({
    requested: true,
    supported: true,
    status: "ok",
    name: sessionName
  });
}

async function observeCodexThread({ threadId, includeTurns = false, load = false, turnLimit = 0 }) {
  const messages = [
    codexInitializeMessage(1)
  ];
  let nextId = 2;
  if (load) {
    messages.push({
      jsonrpc: "2.0",
      id: nextId++,
      method: "thread/resume",
      params: { threadId, excludeTurns: true }
    });
  }
  const readId = nextId;
  messages.push({
    jsonrpc: "2.0",
    id: readId,
    method: "thread/read",
    params: { threadId, includeTurns: Boolean(includeTurns) }
  });
  const result = await runCodexAppServer(messages, { timeout: 5000 });
  if (!result.ok) {
    return {
      adapter: "codex",
      readable: false,
      status: "systemError",
      warning: result.warning,
      ui_visibility: "not_guaranteed"
    };
  }
  const read = result.responses.find((message) => message.id === readId);
  if (!read || read.error) {
    return {
      adapter: "codex",
      readable: false,
      status: "notLoaded",
      warning: read?.error?.message || "Codex app-server did not return thread/read",
      ui_visibility: "not_guaranteed"
    };
  }
  const thread = read.result?.thread || read.result || {};
  const turns = Array.isArray(thread.turns) ? thread.turns : Array.isArray(read.result?.turns) ? read.result.turns : [];
  const recentTurns = turnLimit > 0 ? turns.slice(-turnLimit) : (includeTurns ? turns : []);
  return {
    adapter: "codex",
    readable: true,
    status: inferCodexThreadStatus(thread),
    name: thread.name || thread.title || read.result?.name || null,
    cwd: thread.cwd || read.result?.cwd || null,
    turn_count: turns.length || Number(read.result?.turn_count || read.result?.turnCount || 0),
    updated_at: thread.updated_at || thread.updatedAt || read.result?.updated_at || null,
    turns: recentTurns.map(summarizeCodexTurn),
    ui_visibility: "not_guaranteed"
  };
}

async function readCodexThread(threadId, options = {}) {
  return observeCodexThread({ threadId, includeTurns: Boolean(options.includeTurns), load: false, turnLimit: options.turnLimit || 0 });
}

async function resumeCodexThread(threadId) {
  return runCodexAppServer([
    codexInitializeMessage(1),
    { jsonrpc: "2.0", id: 2, method: "thread/resume", params: { threadId, excludeTurns: true } }
  ], { timeout: 5000 });
}

async function startCodexTurn(threadId, formattedMessage, options = {}) {
  return sendCodexInstruction({
    threadId,
    message: formattedMessage,
    timeout: options.timeout || 300000,
    waitCompletion: Boolean(options.waitCompletion)
  });
}

async function listCodexThreads(options = {}) {
  const result = await runCodexAppServer([
    codexInitializeMessage(1),
    { jsonrpc: "2.0", id: 2, method: "thread/list", params: {} }
  ], { timeout: options.timeout || 5000 });
  if (!result.ok) return { ok: false, warning: result.warning, threads: [] };
  const response = result.responses.find((item) => item.id === 2);
  if (!response || response.error) return { ok: false, warning: response?.error?.message || "Codex thread/list failed", threads: [] };
  return { ok: true, threads: response.result?.data || response.result?.threads || response.result || [] };
}

async function sendCodexInstruction({ threadId, message, timeout, waitCompletion = false }) {
  const messages = [
    codexInitializeMessage(1),
    {
      jsonrpc: "2.0",
      id: 2,
      method: "thread/read",
      params: { threadId, includeTurns: false }
    },
    {
      jsonrpc: "2.0",
      id: 3,
      method: "thread/resume",
      params: { threadId, excludeTurns: true }
    },
    {
      jsonrpc: "2.0",
      id: 4,
      method: "turn/start",
      params: {
        threadId,
        input: [codexTextInput(message)]
      }
    }
  ];
  if (waitCompletion) {
    messages.push({
      jsonrpc: "2.0",
      id: 5,
      method: "thread/read",
      optional: true,
      params: { threadId, includeTurns: true }
    });
  }
  const runOptions = waitCompletion ? {
    timeout,
    waitAfter: {
      id: 4,
      method: "turn/completed",
      timeout: Math.max(1000, parsePositiveInt(timeout, 300000))
    }
  } : { timeout };
  const result = await runCodexAppServer(messages, runOptions);
  if (!result.ok) {
    return { adapter: "codex", status: "failed", thread_id: threadId, warning: result.warning };
  }
  const initialRead = result.responses.find((item) => item.id === 2);
  if (!initialRead || initialRead.error) {
    return { adapter: "codex", status: "failed", thread_id: threadId, warning: initialRead?.error?.message || "Codex thread/read failed before send" };
  }
  const start = result.responses.find((item) => item.id === 4);
  if (!start || start.error) {
    return { adapter: "codex", status: "failed", thread_id: threadId, warning: start?.error?.message || "Codex turn/start failed" };
  }
  const started = result.events.find((item) => item.method === "turn/started");
  if (!waitCompletion) {
    return {
      adapter: "codex",
      status: "delivered",
      thread_id: threadId,
      turn_id: started?.params?.turnId || started?.params?.turn?.id || start.result?.turnId || null,
      completion_status: "not_waited",
      completed_at: null,
      verified_by_thread_read: false,
      warning: "Delivery only; target task completion must be verified by multiagent read, worklog, or a return instruction.",
      ui_visibility: "not_guaranteed"
    };
  }
  const completed = result.events.find((item) => item.method === "turn/completed");
  const finalRead = result.responses.find((item) => item.id === 5);
  return {
    adapter: "codex",
    status: completed ? "completed" : "started_unverified",
    thread_id: threadId,
    turn_id: completed?.params?.turnId || completed?.params?.turn?.id || started?.params?.turnId || started?.params?.turn?.id || start.result?.turnId || null,
    completed_at: completed ? new Date().toISOString() : null,
    verified_by_thread_read: Boolean(finalRead && !finalRead.error),
    verification_warning: completed
      ? finalRead?.error?.message || result.optional_warnings?.[0] || null
      : "Codex turn/completed was not observed; run multiagent read to verify the target lane before assuming delivery completed",
    ui_visibility: "not_guaranteed"
  };
}

async function launchCodexLane({ message, workspaceRoot, timeout }) {
  const messages = [
    codexInitializeMessage(1),
    {
      jsonrpc: "2.0",
      id: 2,
      method: "thread/start",
      params: {
        cwd: workspaceRoot,
        sandbox: "workspace-write",
        approvalPolicy: "on-request"
      }
    },
    ({ responses }) => {
      const response = responses.find((item) => item.id === 2);
      const threadId = extractCodexThreadIdFromStartResponse(response);
      if (!threadId) throw new Error("Codex thread/start did not return thread id");
      return {
        jsonrpc: "2.0",
        id: 3,
        method: "turn/start",
        params: {
          threadId,
          cwd: workspaceRoot,
          input: [codexTextInput(message)]
        }
      };
    },
    ({ responses }) => {
      const response = responses.find((item) => item.id === 2);
      const threadId = extractCodexThreadIdFromStartResponse(response);
      if (!threadId) return null;
      return {
        jsonrpc: "2.0",
        id: 4,
        method: "thread/read",
        optional: true,
        params: { threadId, includeTurns: true }
      };
    }
  ];
  const start = await runCodexAppServer(messages, {
    timeout,
    waitAfter: {
      id: 3,
      method: "turn/completed",
      timeout: Math.max(1000, parsePositiveInt(timeout, 90000))
    }
  });
  const response = start.responses.find((item) => item.id === 2);
  const threadId = extractCodexThreadIdFromStartResponse(response);
  if (!start.ok) {
    return {
      adapter: "codex",
      status: "failed",
      created_thread_id: threadId || null,
      warning: start.warning
    };
  }
  if (!response || response.error) {
    return { adapter: "codex", status: "failed", warning: response?.error?.message || "Codex thread/start failed" };
  }
  if (!threadId) return { adapter: "codex", status: "failed", warning: "Codex thread/start did not return thread id" };
  const turn = start.responses.find((item) => item.id === 3);
  if (!turn || turn.error) {
    return {
      adapter: "codex",
      status: "failed",
      created_thread_id: threadId,
      warning: turn?.error?.message || "Codex turn/start failed",
      ui_visibility: "not_guaranteed"
    };
  }
  const completed = start.events.find((item) => item.method === "turn/completed");
  const started = start.events.find((item) => item.method === "turn/started");
  const turnId = completed?.params?.turnId || completed?.params?.turn?.id || started?.params?.turnId || started?.params?.turn?.id || turn.result?.turnId || null;
  if (!completed) {
    return {
      adapter: "codex",
      status: "failed",
      created_thread_id: threadId,
      turn_id: turnId,
      warning: "Codex turn/completed was not observed for Launch Message",
      ui_visibility: "not_guaranteed"
    };
  }
  const finalRead = start.responses.find((item) => item.id === 4);
  return {
    adapter: "codex",
    status: "completed",
    thread_id: threadId,
    turn_id: turnId,
    warning: null,
    verified_by_thread_read: Boolean(finalRead && !finalRead.error),
    verification_warning: finalRead?.error?.message || start.optional_warnings?.[0] || null,
    ui_visibility: "not_guaranteed"
  };
}

function extractCodexThreadIdFromStartResponse(response) {
  return response?.result?.threadId || response?.result?.data?.threadId || response?.result?.data?.thread?.id || response?.result?.thread?.id || response?.result?.id || null;
}

function inferCodexThreadStatus(thread) {
  const raw = String(thread.status || thread.state || "").toLowerCase();
  if (["active", "running", "in_progress", "busy"].includes(raw)) return "active";
  if (["error", "failed", "systemerror"].includes(raw)) return "systemError";
  return "idle";
}

function summarizeCodexTurn(turn) {
  return {
    id: turn.id || turn.turnId || null,
    status: turn.status || turn.state || null,
    created_at: turn.created_at || turn.createdAt || null,
    updated_at: turn.updated_at || turn.updatedAt || null
  };
}

function codexInitializeMessage(id) {
  return {
    jsonrpc: "2.0",
    id,
    method: "initialize",
    params: {
      clientInfo: {
        name: "starwork",
        version: PACKAGE_VERSION
      },
      capabilities: null
    }
  };
}

function codexTextInput(text) {
  return { type: "text", text, text_elements: [] };
}

function runCodexAppServer(messages, options = {}) {
  return new Promise((resolve) => {
    const timeout = options.timeout || 10000;
    const deadline = Date.now() + timeout;
    const responses = [];
    const events = [];
    const optionalWarnings = [];
    let stderr = "";
    let settled = false;
    let pendingResponse = null;
    let pendingEvent = null;

    const child = spawn("codex", ["app-server", "--listen", "stdio://"], {
      stdio: ["pipe", "pipe", "pipe"]
    });

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearPendingResponse();
      clearPendingEvent();
      try {
        child.stdin.end();
      } catch {
        // Ignore shutdown races.
      }
      if (!child.killed) {
        child.kill("SIGTERM");
      }
      resolve({
        responses,
        events,
        optional_warnings: optionalWarnings,
        ...result
      });
    };

    const fail = (warning) => {
      finish({ ok: false, warning: warning || stderr.trim() || "Codex app-server failed" });
    };

    const remaining = () => Math.max(1, deadline - Date.now());

    const clearPendingResponse = () => {
      if (pendingResponse?.timer) clearTimeout(pendingResponse.timer);
      pendingResponse = null;
    };

    const clearPendingEvent = () => {
      if (pendingEvent?.timer) clearTimeout(pendingEvent.timer);
      pendingEvent = null;
    };

    const waitForResponse = (id) => new Promise((waitResolve, waitReject) => {
      const existing = responses.find((message) => message.id === id);
      if (existing) {
        waitResolve(existing);
        return;
      }
      clearPendingResponse();
      pendingResponse = {
        id,
        resolve: waitResolve,
        reject: waitReject,
        timer: setTimeout(() => waitReject(new Error(`Codex app-server did not return response ${id}`)), remaining())
      };
    });

    const waitForEvent = (method, eventTimeout) => new Promise((waitResolve, waitReject) => {
      const existing = events.find((message) => message.method === method);
      if (existing) {
        waitResolve(existing);
        return;
      }
      clearPendingEvent();
      pendingEvent = {
        method,
        resolve: waitResolve,
        reject: waitReject,
        timer: setTimeout(() => waitReject(new Error(`Codex app-server did not emit ${method}`)), Math.min(remaining(), eventTimeout || timeout))
      };
    });

    const handleMessage = (message) => {
      if (Object.hasOwn(message, "id")) {
        responses.push(message);
        if (pendingResponse && message.id === pendingResponse.id) {
          const pending = pendingResponse;
          clearPendingResponse();
          pending.resolve(message);
        }
      }
      if (message.method) {
        events.push(message);
        if (pendingEvent && message.method === pendingEvent.method) {
          const pending = pendingEvent;
          clearPendingEvent();
          pending.resolve(message);
        }
      }
    };

    child.on("error", (error) => fail(error.message));
    child.on("exit", (code) => {
      if (!settled && code !== 0) {
        fail(stderr.trim() || `codex app-server exited with status ${code}`);
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    const rl = readline.createInterface({ input: child.stdout });
    rl.on("line", (line) => {
      try {
        handleMessage(JSON.parse(String(line).trim()));
      } catch {
        // Ignore non-JSON app-server output.
      }
    });

    const writeMessage = (message) => {
      const { optional, ...jsonRpcMessage } = message;
      child.stdin.write(`${JSON.stringify(jsonRpcMessage)}\n`);
    };

    (async () => {
      try {
        for (const message of messages) {
          if (settled) return;
          const jsonRpcMessage = typeof message === "function" ? message({ responses, events }) : message;
          if (!jsonRpcMessage) continue;
          writeMessage(jsonRpcMessage);
          try {
            await waitForResponse(jsonRpcMessage.id);
          } catch (error) {
            if (jsonRpcMessage.optional) {
              optionalWarnings.push(error.message);
              continue;
            }
            throw error;
          }
          if (options.waitAfter?.id === jsonRpcMessage.id) {
            try {
              await waitForEvent(options.waitAfter.method, options.waitAfter.timeout);
            } catch {
              // Returning sent/timeout is handled by the caller from collected events.
            }
          }
        }
        finish({ ok: true, warning: stderr.trim() || null });
      } catch (error) {
        fail(error.message);
      }
    })();
  });
}

function parseJsonRpcMessages(stdout) {
  const messages = [];
  const lines = String(stdout || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    try {
      messages.push(JSON.parse(line));
    } catch {
      // Ignore non-JSON app-server output.
    }
  }
  return messages;
}

function parseJsonRpcResponse(stdout, id) {
  const lines = String(stdout || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    try {
      const message = JSON.parse(line);
      if (message.id === id) return message;
    } catch {
      // Ignore non-JSON app-server output.
    }
  }
  return null;
}

function normalizeMarkdownCell(value) {
  return String(value || "").replace(/\r?\n/g, " ").trim();
}

function escapeMarkdownCell(value) {
  return normalizeMarkdownCell(value).replace(/\|/g, "\\|");
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildLaneRequestId(toLane) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").replace("T", "-");
  return `REQ-${stamp}-${toLane}`;
}

function buildSharedRequestRow({ id, from, to, request, status, hostDelivery, link }) {
  return {
    id,
    from,
    to,
    request: normalizeMarkdownCell(request),
    status,
    host_delivery: hostDelivery,
    link,
    updated: todayIsoDate()
  };
}

function normalizeHostDeliveryStatus(value) {
  const normalized = normalizeMarkdownCell(value || "");
  if (!HOST_DELIVERY_STATUSES.has(normalized)) {
    throw new Error(`--host-delivery 必须是 ${[...HOST_DELIVERY_STATUSES].join(" / ")}。`);
  }
  return normalized;
}

function parsePositiveInt(value, fallback) {
  if (value == null || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error("timeout/turns 必须是正整数。");
  }
  return parsed;
}

function slugifyProjectId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadPack(packIdOrPath, language = "zh") {
  const packPath = path.isAbsolute(packIdOrPath) || packIdOrPath.startsWith(".")
    ? path.resolve(packIdOrPath)
    : path.join(PRODUCT_ROOT, "packs", packIdOrPath);
  const jsonPath = path.join(packPath, "pack.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`找不到 Pack 声明：${jsonPath}`);
  }
  const basePack = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const languagePack = loadPackLanguage(packPath, language);
  const pack = mergePackLanguage(basePack, languagePack, language);
  pack.__dir = packPath;
  return pack;
}

function loadPackLanguage(packPath, language) {
  const languagesDir = path.join(packPath, "languages");
  if (!fs.existsSync(languagesDir)) {
    return null;
  }
  const languagePath = path.join(languagesDir, `${language}.json`);
  if (!fs.existsSync(languagePath)) {
    throw new Error(`Pack 缺少语言配置：${path.relative(PRODUCT_ROOT, languagePath)}`);
  }
  return JSON.parse(fs.readFileSync(languagePath, "utf8"));
}

function mergePackLanguage(basePack, languagePack, requestedLanguage) {
  if (!languagePack) {
    return {
      ...basePack,
      language: requestedLanguage
    };
  }
  return {
    ...basePack,
    language: languagePack.language || requestedLanguage,
    name: languagePack.name || basePack.name || basePack.id,
    paths: languagePack.paths || basePack.paths || {},
    overrides: {
      ...(basePack.overrides || {}),
      ...(languagePack.overrides || {})
    },
    rules: languagePack.rules || basePack.rules || [],
    directories: languagePack.directories || basePack.directories || [],
    templates: languagePack.templates || basePack.templates || [],
    seed: languagePack.seed || basePack.seed || []
  };
}

function validatePack(pack, workspaceType) {
  if (!packSupportsWorkspaceType(pack, workspaceType)) {
    throw new Error(`Pack ${pack.id} 不支持工作区类型 ${workspaceType}。`);
  }
  if (!pack.paths || Object.keys(pack.paths).length === 0) {
    throw new Error(`Pack ${pack.id} 缺少语言化路径配置。`);
  }
}

function packSupportsWorkspaceType(pack, workspaceType) {
  const supported = pack.supports_workspace_types || [];
  return supported.includes(workspaceType) || supported.includes(normalizeWorkspaceTypeForSupport(workspaceType));
}

function renderPackRules(pack, variables) {
  return renderPackRuleSlots(pack, variables)
    .map((slot) => slot.content)
    .filter(Boolean)
    .join("\n\n");
}

function renderPackRuleSlots(pack, variables, group = "场景规则") {
  const slots = [];
  for (const rule of pack.rules || []) {
    const source = path.join(pack.__dir, rule.from);
    if (!fs.existsSync(source)) {
      throw new Error(`Pack rule 不存在：${pack.id}/${rule.from}`);
    }
    const content = renderText(fs.readFileSync(source, "utf8"), variables).trim();
    if (!content) continue;
    slots.push({
      slot: normalizePackRuleSlot(pack, rule),
      group,
      content
    });
  }
  return slots;
}

function normalizePackRuleSlot(pack, rule) {
  const fallback = rule.id || path.basename(rule.from || "rule", path.extname(rule.from || ""));
  const explicit = rule.slot || `pack.${pack.id}.${fallback}`;
  if (explicit.startsWith(`pack.${pack.id}.`)) return explicit;
  if (explicit.startsWith("pack.")) return `pack.${pack.id}.${explicit.slice("pack.".length)}`;
  return explicit;
}

function renderText(text, variables) {
  return text.replace(/\{\{([^}]+)\}\}/g, (_, expression) => {
    const value = getPath(variables, expression.trim());
    return value == null ? "" : String(value);
  });
}

function getPath(object, expression) {
  return expression.split(".").reduce((current, key) => {
    if (current == null) return undefined;
    return current[key];
  }, object);
}

function fileAction(targetDir, relativePath, content) {
  const target = path.join(targetDir, relativePath);
  if (!fs.existsSync(target)) {
    return { type: "file", mode: "create", target, relativePath, content };
  }
  const existing = fs.readFileSync(target, "utf8");
  if (!existing.trim()) {
    return { type: "file", mode: "overwrite-empty", target, relativePath, content };
  }
  const alternate = nextAvailableSibling(target);
  return { type: "file", mode: "create-new", target: alternate, originalTarget: target, relativePath: path.relative(targetDir, alternate), content };
}

function idempotentFileAction(targetDir, relativePath, content) {
  const target = path.join(targetDir, relativePath);
  if (!fs.existsSync(target)) {
    return { type: "file", mode: "create", target, relativePath, content };
  }
  const existing = fs.readFileSync(target, "utf8");
  if (!existing.trim()) {
    return { type: "file", mode: "overwrite-empty", target, relativePath, content };
  }
  return { type: "file", mode: "skip", target, relativePath, content: "" };
}

function strictFileAction(targetDir, relativePath, content) {
  const target = path.join(targetDir, relativePath);
  if (fs.existsSync(target)) {
    throw new Error(`目标文件已存在，upgrade 不会覆盖：${relativePath}`);
  }
  return { type: "file", mode: "create", target, relativePath, content };
}

function overwriteFileAction(targetDir, relativePath, content) {
  const target = path.join(targetDir, relativePath);
  return { type: "file", mode: "overwrite", target, relativePath, content };
}

function upsertFileAction(targetDir, relativePath, content) {
  const target = path.join(targetDir, relativePath);
  return { type: "file", mode: fs.existsSync(target) ? "overwrite" : "create", target, relativePath, content };
}

function directoryAction(targetDir, relativePath) {
  const target = path.join(targetDir, relativePath);
  return { type: "directory", mode: fs.existsSync(target) ? "exists" : "create", target, relativePath };
}

function symlinkAction(targetDir, relativePath, sourcePath) {
  const target = path.join(targetDir, relativePath);
  return { type: "symlink", mode: "create", target, relativePath, sourcePath };
}

function nextAvailableSibling(target) {
  const ext = path.extname(target);
  const base = target.slice(0, target.length - ext.length);
  let candidate = `${base}.starwork-new${ext}`;
  let index = 2;
  while (fs.existsSync(candidate)) {
    candidate = `${base}.starwork-new-${index}${ext}`;
    index += 1;
  }
  return candidate;
}

function dedupeActions(actions) {
  const seen = new Set();
  const result = [];
  for (const action of actions) {
    const key = `${action.type}:${action.target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(action);
  }
  return result;
}

function applyPlan(plan) {
  for (const action of plan.actions) {
    if (action.mode === "exists" || action.mode === "skip") continue;
    if (action.type === "directory") {
      fs.mkdirSync(action.target, { recursive: true });
      continue;
    }
    if (action.type === "symlink") {
      fs.mkdirSync(path.dirname(action.target), { recursive: true });
      if (!fs.existsSync(action.target)) {
        fs.symlinkSync(action.sourcePath, action.target, "dir");
      }
      continue;
    }
    fs.mkdirSync(path.dirname(action.target), { recursive: true });
    fs.writeFileSync(action.target, action.content, "utf8");
  }
}

function printGenericPlan(title, actions) {
  const creates = actions.filter((action) => action.type === "file" && action.mode === "create");
  const overwrites = actions.filter((action) => action.type === "file" && (action.mode === "overwrite" || action.mode === "overwrite-empty"));
  const createNew = actions.filter((action) => action.type === "file" && action.mode === "create-new");
  const dirs = actions.filter((action) => action.type === "directory" && action.mode === "create");

  console.log("");
  console.log(title);
  console.log("");
  if (dirs.length) {
    console.log("将创建目录：");
    dirs.forEach((action) => console.log(`- ${action.relativePath}`));
    console.log("");
  }
  if (creates.length) {
    console.log("将创建文件：");
    creates.forEach((action) => console.log(`- ${action.relativePath}`));
    console.log("");
  }
  if (overwrites.length) {
    console.log("将更新文件：");
    overwrites.forEach((action) => console.log(`- ${action.relativePath}`));
    console.log("");
  }
  if (createNew.length) {
    console.log("不会覆盖已有内容，将生成旁路文件：");
    createNew.forEach((action) => console.log(`- ${path.relative(path.dirname(action.originalTarget), action.originalTarget)} -> ${action.relativePath}`));
    console.log("");
  }
}

function printPlan(plan, dryRun) {
  const creates = plan.actions.filter(actionCreatesFromUserView);
  const updates = plan.actions.filter(actionUpdatesFromUserView);
  const createNew = plan.actions.filter((action) => action.mode === "create-new");
  const isExistingProject = isExistingProjectTarget(plan);

  console.log("");
  console.log(dryRun ? "创建工作台预览：" : "创建工作台计划：");
  if (dryRun) {
    console.log("这是预览，不会写入文件。");
  }
  console.log("");
  console.log(`工作台名称：${plan.workspaceName}`);
  console.log(`工作台类型：${plan.workspaceLabel}`);
  console.log(`语言：${friendlyLanguage(plan.language)}`);
  console.log(`会加入的场景能力：${friendlyPackName(plan.pack.id || plan.pack.name)}`);
  console.log(`目标目录：${plan.targetDir}`);
  console.log(`是否新建目录：${plan.targetExists ? "否，目标目录已存在" : "是"}`);
  console.log(`确认后的成果会放在：${plan.formalSource}`);
  console.log(`日常工作会放在：${plan.businessWorkArea}`);
  console.log(`项目知识库：${plan.knowledgeRoot ? `开启（${plan.knowledgeRoot}）` : "暂不开启"}`);
  if (plan.blueprint) {
    console.log(`初始化定制单：${plan.blueprint.__path}`);
  }
  if (plan.skills?.length) {
    console.log(`会带上的 AI 使用说明：${plan.skills.map((skill) => skill.id).join("、")}`);
  }
  console.log("");
  if (isExistingProject) {
    console.log("检测到这是已有项目。");
    console.log("StarWork 会保留现有文件，先生成待整合草稿，不直接覆盖已有 AI 规则文件。");
    console.log("");
  }

  console.log("会创建：");
  if (creates.length) {
    creates.forEach((action) => console.log(`- ${action.relativePath}`));
  } else {
    console.log("- 无");
  }
  console.log("");

  console.log("会更新：");
  if (updates.length) {
    updates.forEach((action) => console.log(`- ${action.relativePath}`));
  } else {
    console.log("- 无");
  }
  console.log("");

  console.log("不会改动：");
  console.log("- 你的业务代码");
  console.log("- 已有非空 AI 规则文件");
  if (createNew.length) {
    console.log("- 已有同名文件会保留，StarWork 会另存旁路文件");
    createNew.forEach((action) => console.log(`- ${path.relative(plan.targetDir, action.originalTarget)} -> ${action.relativePath}`));
  }
  console.log("");

  console.log("需要你确认：");
  console.log("- 目标路径是否正确");
  console.log("- 是否接受这些 StarWork 协作文件");
  console.log("");
}

function renderInitPlanJson(plan, dryRun) {
  return {
    schema: "starwork.init.plan_result.v0.1",
    target: plan.targetDir,
    dry_run: Boolean(dryRun),
    ok: true,
    workspace_type: plan.workspaceType,
    kit: plan.kit,
    language: plan.language,
    pack: plan.pack?.id || null,
    actions: plan.actions.map((action) => ({
      type: action.type,
      mode: action.mode,
      path: action.relativePath,
      status: action.mode === "exists" ? "exists" : "planned"
    })),
    user_summary: buildInitUserSummary(plan, dryRun)
  };
}

function buildInitUserSummary(plan, dryRun) {
  const willCreate = plan.actions
    .filter(actionCreatesFromUserView)
    .map((action) => action.relativePath);
  const willUpdate = plan.actions
    .filter(actionUpdatesFromUserView)
    .map((action) => action.relativePath);
  return {
    product_purpose: "把项目整理成 AI 协作工作台",
    mode: dryRun ? "preview_no_write" : "write_after_confirmation",
    target_kind: isExistingProjectTarget(plan) ? "existing_project" : "new_workspace",
    will_create: willCreate,
    will_update: willUpdate,
    will_not_touch: [
      "你的业务代码",
      "已有非空 AI 规则文件"
    ],
    needs_confirmation: [
      "目标路径是否正确",
      "是否接受这些 StarWork 协作文件"
    ]
  };
}

function actionCreatesFromUserView(action) {
  if (!action || action.mode === "exists" || action.mode === "skip") return false;
  if (action.type === "directory") return action.mode === "create";
  if (action.type === "symlink") return action.mode === "create" && !fs.existsSync(action.target);
  if (action.type !== "file") return false;
  if (action.mode === "create" || action.mode === "create-new") return true;
  if (action.mode === "overwrite" || action.mode === "overwrite-empty") return !fs.existsSync(action.target);
  return false;
}

function actionUpdatesFromUserView(action) {
  if (!action || action.type !== "file") return false;
  if (action.mode !== "overwrite" && action.mode !== "overwrite-empty") return false;
  return fs.existsSync(action.target);
}

function isExistingProjectTarget(plan) {
  if (!plan.targetExists || !fs.existsSync(plan.targetDir)) return false;
  const entries = fs.readdirSync(plan.targetDir).filter((entry) => entry !== ".DS_Store");
  return entries.length > 0;
}

function printSpawnPlan(plan, dryRun) {
  const creates = plan.actions.filter((action) => action.type === "file" && action.mode === "create");
  const overwrites = plan.actions.filter((action) => action.type === "file" && action.mode === "overwrite");
  const links = plan.actions.filter((action) => action.type === "symlink");
  const dirs = plan.actions.filter((action) => action.type === "directory" && action.mode === "create");

  console.log("");
  console.log(dryRun ? "从项目中心创建项目工作台预览（dry run）：" : "从项目中心创建项目工作台计划：");
  console.log("");
  console.log(`项目中心：${plan.hubRoot}`);
  console.log(`项目名称：${plan.projectName}`);
  console.log(`项目 ID：${plan.projectId}`);
  console.log(`目标目录：${plan.targetDir}`);
  console.log(`项目类型：${plan.modeLabel}`);
  console.log(`语言：${friendlyLanguage(plan.language)}`);
  console.log(`基础结构：项目工作台`);
  if (plan.skills?.length) {
    console.log(`会带上的 AI 使用说明：${plan.skills.map((skill) => skill.id).join("、")}`);
  }
  if (plan.blueprint) {
    console.log(`定制方案：${plan.blueprint.__path}`);
    console.log(`正式成果会放在：${plan.blueprint.paths?.formal_source || "(默认)"}`);
    console.log(`日常工作会放在：${plan.blueprint.paths?.business_work_area || "(默认)"}`);
  }
  console.log("");

  if (creates.length) {
    console.log("将在新项目中创建：");
    creates.slice(0, 40).forEach((action) => console.log(`- ${action.relativePath}`));
    if (creates.length > 40) console.log(`- ... 另有 ${creates.length - 40} 项`);
    console.log("");
  }
  if (dirs.length) {
    console.log("将在新项目中创建目录：");
    dirs.forEach((action) => console.log(`- ${action.relativePath}`));
    console.log("");
  }
  if (links.length) {
    console.log("将挂载项目中心共享资源：");
    links.forEach((action) => console.log(`- ${action.relativePath} -> ${action.sourcePath}`));
    console.log("");
  }
  if (overwrites.length) {
    console.log("将在项目中心中更新：");
    overwrites.forEach((action) => console.log(`- ${action.relativePath}`));
    console.log("");
  }
}

function printUpgradePlan(plan, dryRun) {
  const creates = plan.actions.filter((action) => action.type === "file" && action.mode === "create");
  const overwrites = plan.actions.filter((action) => action.type === "file" && action.mode === "overwrite");
  const dirs = plan.actions.filter((action) => action.type === "directory" && action.mode === "create");
  const existingDirs = plan.actions.filter((action) => action.type === "directory" && action.mode === "exists");

  console.log("");
  console.log(dryRun ? "升级预览（dry run）：" : "升级计划：");
  console.log("");
  console.log(`目标目录：${plan.targetDir}`);
  console.log(`升级方案：${plan.blueprint.__path}`);
  console.log(`策略：${plan.strategy}`);
  console.log(`工作台类型：${friendlyWorkspaceType(plan.workspaceType)}`);
  console.log(`基础结构：${plan.kit === "hub" ? "项目中心" : "项目工作台"}`);
  console.log(`语言：${friendlyLanguage(plan.language)}`);
  console.log(`场景能力：${plan.pack ? friendlyPackName(plan.pack.id || plan.pack.name) : "不额外安装"}`);
  console.log(`正式成果会放在：${plan.blueprint.paths.formal_source}`);
  console.log(`日常工作会放在：${plan.blueprint.paths.business_work_area}`);
  console.log("");

  if (dirs.length) {
    console.log("将创建目录：");
    dirs.forEach((action) => console.log(`- ${action.relativePath}`));
    console.log("");
  }
  if (creates.length) {
    console.log("将创建文件：");
    creates.slice(0, 60).forEach((action) => console.log(`- ${action.relativePath}`));
    if (creates.length > 60) console.log(`- ... 另有 ${creates.length - 60} 项`);
    console.log("");
  }
  if (overwrites.length) {
    console.log("将注入或更新文件：");
    overwrites.forEach((action) => console.log(`- ${action.relativePath}`));
    console.log("");
  }
  if (existingDirs.length) {
    console.log("会保留并复用已有目录：");
    existingDirs.forEach((action) => console.log(`- ${action.relativePath}`));
    console.log("");
  }
  if (plan.blueprint.preserve?.length) {
    console.log("明确保留不移动：");
    plan.blueprint.preserve.forEach((item) => console.log(`- ${item}`));
    console.log("");
  }
}

function renderUpgradePlanJson(plan, dryRun) {
  return {
    schema: "starwork.upgrade.plan_result.v0.1",
    target: plan.targetDir,
    dry_run: Boolean(dryRun),
    ok: true,
    strategy: plan.strategy,
    workspace_type: plan.workspaceType,
    kit: plan.kit,
    language: plan.language,
    pack: plan.pack?.id || null,
    actions: plan.actions.map((action) => ({
      type: action.type,
      mode: action.mode,
      path: action.relativePath,
      status: action.mode === "exists" ? "exists" : "planned"
    })),
    blocked: [],
    warnings: []
  };
}

function renderUpgradeExecutionJson(plan) {
  return {
    schema: "starwork.upgrade.execution_result.v0.1",
    target: plan.targetDir,
    ok: true,
    executed: plan.actions
      .filter((action) => action.mode !== "exists" && action.mode !== "skip")
      .map((action) => ({
        type: action.type,
        mode: action.mode,
        path: action.relativePath,
        status: "done"
      })),
    skipped: plan.actions
      .filter((action) => action.mode === "exists" || action.mode === "skip")
      .map((action) => ({
        type: action.type,
        mode: action.mode,
        path: action.relativePath,
        status: "skipped"
      })),
    next_check: `starwork doctor --target ${plan.targetDir}`
  };
}

function walkFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      result.push(fullPath);
    }
  }
  return result;
}

function findWorkspaceRoot(startDir) {
  let current = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(current, ".starwork", "workspace.json"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function getKitDefaultFormalSource(kit) {
  if (kit === "hub") return "projects/";
  return "输出/确认成果/";
}

function getKitLanguage(kit) {
  return "zh";
}

function printHelp() {
  console.log(`StarWork CLI ${PACKAGE_VERSION}

Usage:
  starwork <command> [options]

Commands:
  init             创建项目工作台或项目中心。
  doctor           检查工作台是否完整，也能识别旧目录的整理线索。
  knowledge        开启、检查和按方案整理项目知识库。
  spawn            从项目中心创建新的项目工作台。
  audit            从项目中心巡检已登记项目。
  repair           按确认过的修复方案处理项目问题。
  upgrade          按确认过的升级方案整理旧工作区。
  adapt            生成不同 AI 工具需要的入口文件。
  pack install     给健康工作台加入新的场景能力。
  multiagent       管理多个 AI 会话的分工、绑定和共享索引。

常用开始：
  starwork init --type project --pack general --language zh --target ./my-workspace --yes
  starwork init --type hub --language zh --target ./my-hub --yes
  starwork doctor --target ./my-workspace
  starwork knowledge init --target ./my-workspace --dry-run
  starwork multiagent init --lanes research,writing,review --target ./my-workspace --yes
  starwork spawn --hub ./my-hub --name "New Project" --target ./new-project --yes

全局选项：
  --help, -h       查看帮助。
  --version, -v    查看 CLI 版本。

查看命令帮助：
  starwork init --help
  starwork doctor --help
  starwork knowledge --help
  starwork spawn --help
  starwork audit --help
  starwork repair --help
  starwork upgrade --help
  starwork adapt --help
  starwork pack install --help
  starwork multiagent --help
`);
}

function printVersion() {
  console.log(PACKAGE_VERSION);
}

function printInitHelp() {
  console.log(`StarWork Init

Usage:
  starwork init [options]

starwork init 会把一个目录整理成 StarWork 工作台，让 AI 能找到项目说明、当前任务、协作规则和交接记录。

项目工作台默认加入通用工作能力；项目中心会自动加入项目中心管理能力。

Options:
  --type <project|hub>
      project 创建项目工作台；hub 创建项目中心。
  --pack <general|content-creator|hub-management|path>
  --language <zh|en>
  --name <name>
  --blueprint <init-blueprint.json>
  --formal-source <path>
  --knowledge
      初始化时同时开启项目知识库。默认不开启。
  --adapter <codex|claude-code|cursor|trae|all>
      初始化完成后继续生成对应 AI 工具适配入口。
  --agent-docs <draft|skip|write>
      已有 AI 规则文件时，先生成待整合草稿，不覆盖原文件。
  --target <path>
  --dry-run
      预览将要写入的文件，不做真实改动。
  --no-skills
  --yes, -y
      确认执行，会真实写入 StarWork 工作台文件。

示例：
  starwork init --type project --pack general --language zh --target ./my-workspace --yes
  starwork init --target ./custom-workspace --blueprint ./init-blueprint.json --dry-run
  starwork init --type hub --language zh --target ./my-hub --yes
  starwork init --type project --language zh --target ./my-workspace --knowledge --yes
  starwork init --type project --language zh --target ./cursor-workspace --adapter cursor --yes
  starwork init --type project --pack general --target ./preview-workspace --dry-run
`);
}

function printKnowledgeHelp() {
  console.log(`StarWork Knowledge

Usage:
  starwork knowledge init [options]
  starwork knowledge status [options]
  starwork knowledge check [options]
  starwork knowledge apply --blueprint <knowledge-blueprint.json> [options]

项目知识库是可选能力，用于让 AI 长期整理当前项目里的稳定知识。
它不是原始资料夹，也不会自动移动旧的 知识/ 或 knowledge/。

Options:
  --target <path>
  --language <zh|en>
  --path <path>
  --blueprint <path>
  --json
  --dry-run
  --yes, -y

示例：
  starwork knowledge init --target ./my-workspace --dry-run
  starwork knowledge init --target ./my-workspace --yes
  starwork knowledge status --target ./my-workspace --json
  starwork knowledge check --target ./my-workspace
  starwork knowledge apply --target ./my-workspace --blueprint ./knowledge-blueprint.json --dry-run
`);
}

function printSpawnHelp() {
  console.log(`StarWork Spawn

Usage:
  starwork spawn --hub <hub-path> --name <project-name> --target <path> [options]
  starwork spawn --hub <hub-path> --target <path> --blueprint <blueprint.json> [options]

从项目中心创建一个新的项目工作台。命令参数仍叫 --hub，用来兼容内部字段和旧脚本。

Options:
  --hub <path>
  --blueprint <path>
  --name <name>
  --target <path>
  --mode <project>
      project 创建项目工作台；starter 是兼容旧参数，等同于 project
  --language <zh|en>
  --id <project-id>
  --status <active|paused>
  --dry-run
  --yes, -y

示例：
  starwork spawn --hub ./my-hub --name "New Project" --target ./new-project --language zh --yes
  starwork spawn --hub ./my-hub --name "English Project" --target ./en-project --language en --yes
  starwork spawn --hub ./my-hub --target ./new-project --blueprint ./blueprint.json --dry-run
`);
}

function printAuditHelp() {
  console.log(`StarWork Audit

Usage:
  starwork audit [options]

Options:
  --hub <path>
  --project <project-id>
  --json
  --strict
  --inventory-depth <number|all>
  --inventory-limit <number>
  --help

示例：
  starwork audit --hub ./my-hub --json
  starwork audit --hub ./my-hub --project content-site
`);
}

function printRepairHelp() {
  console.log(`StarWork Repair

Usage:
  starwork repair --blueprint <repair-blueprint.json> [options]

Options:
  --blueprint <path>
  --dry-run
  --json
  --yes, -y
  --help

示例：
  starwork repair --blueprint ./repair-blueprint.json --dry-run
  starwork repair --blueprint ./repair-blueprint.json --yes
`);
}

function printDoctorHelp() {
  console.log(`StarWork Doctor

Usage:
  starwork doctor [options]

检查一个目录是不是完整的 StarWork 工作台；如果是旧版目录，
会把可整理的线索列出来，方便后续交给 AI 进一步判断。

Options:
  --target <path>
  --host <codex|claude-code|cursor|trae|all>
  --json
  --strict
  --verbose
  --inventory-depth <number|all>
  --inventory-limit <number>

示例：
  starwork doctor --target ./my-workspace
  starwork doctor --target ./my-workspace --host cursor
  starwork doctor --target ./my-workspace --host all --json
  starwork doctor --target ./old-workspace --json --inventory-depth all
`);
}

function printUpgradeHelp() {
  console.log(`StarWork Upgrade

Usage:
  starwork upgrade --target <path> --blueprint <upgrade-blueprint.json> --dry-run
  starwork upgrade --target <path> --blueprint <upgrade-blueprint.json> --yes

Options:
  --target <path>
  --blueprint <upgrade-blueprint.json>
  --dry-run
  --json
  --yes, -y

示例：
  starwork upgrade --target ./old-workspace --blueprint ./upgrade-blueprint.json --dry-run
  starwork upgrade --target ./old-workspace --blueprint ./upgrade-blueprint.json --yes
`);
}

function printAdaptHelp() {
  console.log(`StarWork Adapt

Usage:
  starwork adapt [codex|claude-code|cursor|trae|all] [options]
  starwork adapt [codex|claude-code|cursor|trae|all] --capabilities [options]
  starwork adapt [codex|claude-code|cursor|trae|all] --check [options]

Options:
  --agent <codex|claude|claude-code|cursor|trae|all>
  --target <path>
  --capabilities
  --check
  --agent-docs <draft|skip|write>
  --dry-run
  --json
  --yes, -y

示例：
  starwork adapt claude-code --target ./my-workspace --yes
  starwork adapt cursor --capabilities
  starwork adapt cursor --check --target ./my-workspace --json
  starwork adapt all --target ./my-workspace --dry-run
`);
}

function printPackHelp() {
  console.log(`StarWork Pack

Usage:
  starwork pack install <pack> [options]

示例：
  starwork pack install general --target ./my-workspace --dry-run
  starwork pack install content-creator --target ./my-workspace --yes
`);
}

function printPackInstallHelp() {
  console.log(`StarWork Pack Install

Usage:
  starwork pack install <general|content-creator|hub-management> [options]

Options:
  --target <path>
  --dry-run
  --yes, -y

示例：
  starwork pack install general --target ./my-workspace --dry-run
  starwork pack install content-creator --target ./my-workspace --yes
`);
}

function printLanesHelp() {
  console.log(`StarWork Multiagent

Usage:
  starwork multiagent <init|add|bind|release|status|upgrade|read|instruct|handoff|continue|launch|message|request|workflow|share> [options]

Agent Lanes 用于同一项目内多个 Agent 会话按项目自定义职责位协作。

Subcommands:
  init       创建 Agent Lanes 协作文件。
  add        新增一个 lane。
  bind       将当前会话绑定到 lane。
  release    释放 lane 的当前会话绑定。
  status     查看 lane 分工和共享请求，可加 --host 观察宿主会话。
  upgrade    预览并确认迁移旧版 MultiAgent 协作结构。
  read       读取某个 lane 绑定宿主的可用近况；Claude Code 只输出 transcript 摘要。
  instruct   向另一个 lane 发送格式化跨会话指令。
  handoff    生成并记录人工交付消息，不后台发送。
  continue   输出继续某个 lane 宿主会话的人工命令或步骤。
  launch     旧入口：为 Codex 生成 Launch Message；实际创建由 starworkMultiagent 调用 create_thread。
  message    生成标准 launch / instruction 消息模板，不写状态。
  request    记录已由 Skill 或人工完成的跨 lane 请求投递状态。
  workflow   管理 next workflow run state、route 和 event。
  share      登记一个跨 lane 可读输出。

示例：
  starwork multiagent init --lanes research,writing,review --target ./my-workspace --yes
  starwork multiagent add review --purpose "审校和风险检查" --write "reviews/**,product/docs/**" --target ./my-workspace --yes
  starwork multiagent bind research --session codex:manual-research-1 --session-name "Research Agent" --target ./my-workspace --yes
  starwork multiagent status --host --target ./my-workspace --json
  starwork multiagent upgrade --target ./my-workspace --dry-run
  starwork multiagent message instruct development --from product-planning --message "请根据 SPEC 开始实现。" --target ./my-workspace --json
  starwork multiagent request record --from product-planning --to development --message "请根据 SPEC 开始实现。" --host-delivery delivered_via_codex_thread_tool --delivery-tool send_message_to_thread --target ./my-workspace --yes
  starwork multiagent workflow route --run WF-20260622-issue-to-delivery --event ready_for_design --target ./my-workspace --json
`);
}

function printLanesInitHelp() {
  console.log(`StarWork Multiagent Init

Usage:
  starwork multiagent init [options]

Options:
  --target <path>
  --lanes <lane1,lane2>
  --dry-run
  --yes, -y

示例：
  starwork multiagent init --lanes research,writing,review --target ./my-workspace --yes
`);
}

function printLanesAddHelp() {
  console.log(`StarWork Multiagent Add

Usage:
  starwork multiagent add <lane-id> --purpose <text> --write <path-globs> [options]

Options:
  --target <path>
  --purpose <text>
  --write <path-globs>
  --dry-run
  --yes, -y
`);
}

function printLanesBindHelp() {
  console.log(`StarWork Multiagent Bind

Usage:
  starwork multiagent bind <lane-id> [options]

Options:
  --target <path>
  --agent <codex|claude|cursor|trae|manual>
  --session <agent:session-id>
  --session-name <name>
  --pin
  --json
  --dry-run
  --yes, -y

说明：
  bind 只记录 StarWork lane binding，不调用 Codex host 工具。
  --session-name / --pin 需要 starworkMultiagent 先在 Codex App 中调用 set_thread_title / set_thread_pinned，本命令只记录结果。
`);
}

function printLanesReleaseHelp() {
  console.log(`StarWork Multiagent Release

Usage:
  starwork multiagent release <lane-id> [options]

Options:
  --target <path>
  --dry-run
  --yes, -y
`);
}

function printLanesStatusHelp() {
  console.log(`StarWork Multiagent Status

Usage:
  starwork multiagent status [options]

Options:
  --target <path>
  --json
  --host
  --load
  --transcript <path>  Claude Code transcript JSONL 文件或目录，只读摘要
`);
}

function printLanesUpgradeHelp() {
  console.log(`StarWork Multiagent Upgrade

Usage:
  starwork multiagent upgrade [options]

Options:
  --target <path>
  --dry-run
  --json
  --yes, -y

说明：
  这是 MultiAgent 协作结构迁移，不会创建或通知 AI 会话。
  默认先使用 --dry-run 预览；确认后 --yes 会备份旧文件、补齐安全结构并写 migration report。

示例：
  starwork multiagent upgrade --target ./my-workspace --dry-run
  starwork multiagent upgrade --target ./my-workspace --json --dry-run
  starwork multiagent upgrade --target ./my-workspace --yes
`);
}

function printLanesReadHelp() {
  console.log(`StarWork Multiagent Read

Usage:
  starwork multiagent read <lane-id> [options]

Options:
  --target <path>
  --turns <n>
  --include-turns
  --transcript <path>  Claude Code transcript JSONL 文件或目录，只读摘要
  --json
`);
}

function printLanesInstructHelp() {
  console.log(`StarWork Multiagent Instruct

Usage:
  starwork multiagent instruct <to-lane> --from <from-lane> --message <text> [options]

Options:
  --target <path>
  --from <lane-id>
  --message <text>
  --timeout <ms>
  --wait, --wait-completion  显式等待目标 turn completed；默认只确认投递
  --json
  --dry-run
  --yes, -y
`);
}

function printLanesHandoffHelp() {
  console.log(`StarWork Multiagent Handoff

Usage:
  starwork multiagent handoff <to-lane> --from <from-lane> --message <text> [options]

Options:
  --target <path>
  --from <lane-id>
  --message <text>
  --json
  --dry-run
  --yes, -y

说明：
  handoff 只生成并记录可复制交付消息，不后台发送给任何宿主会话。
`);
}

function printLanesContinueHelp() {
  console.log(`StarWork Multiagent Continue

Usage:
  starwork multiagent continue <lane-id> [options]

Options:
  --target <path>
  --json

说明：
  Claude Code 会输出 claude --resume <session-id>；Cursor / Trae 输出人工继续步骤。
`);
}

function printLanesLaunchHelp() {
  console.log(`StarWork Multiagent Launch

Usage:
  starwork multiagent launch <lane-id> [options]
  starwork multiagent launch --lanes <lane1,lane2> [options]

Options:
  --target <path>
  --lanes <lane1,lane2>
  --session-name <name>  覆盖默认 "<职责名> Agent" 会话名
  --pin
  --timeout <ms>
  --json
  --dry-run
  --yes, -y

说明：
  Codex 标准路径下，CLI 不创建 thread、不改名、不置顶。请让 starworkMultiagent 调用 create_thread / set_thread_title / set_thread_pinned，成功后再用 bind 记录 StarWork 状态。
`);
}

function printLanesMessageHelp() {
  console.log(`StarWork Multiagent Message

Usage:
  starwork multiagent message <launch|instruct> [options]

说明：
  只生成 STARWORK:MULTIAGENT_MESSAGE 模板，不调用宿主、不写 shared/state。
`);
}

function printLanesMessageLaunchHelp() {
  console.log(`StarWork Multiagent Message Launch

Usage:
  starwork multiagent message launch <lane-id> [options]

Options:
  --target <path>
  --from <lane-id>
  --session-name <name>
  --json
`);
}

function printLanesMessageInstructHelp() {
  console.log(`StarWork Multiagent Message Instruct

Usage:
  starwork multiagent message instruct <to-lane> --from <from-lane> --message <text> [options]

Options:
  --target <path>
  --from <lane-id>
  --message <text>
  --id <request-id>
  --json
`);
}

function printLanesRequestHelp() {
  console.log(`StarWork Multiagent Request

Usage:
  starwork multiagent request record [options]

说明：
  只记录已发生的跨 lane 请求投递状态，不调用宿主。
`);
}

function printLanesRequestRecordHelp() {
  console.log(`StarWork Multiagent Request Record

Usage:
  starwork multiagent request record --from <lane> --to <lane> --message <text> --host-delivery <status> --delivery-tool <tool> [options]

Options:
  --target <path>
  --from <lane-id>
  --to <lane-id>
  --message <text>
  --host-delivery <delivered_via_codex_thread_tool|delivered_via_claude_code_session_tool|recorded_only|manual_handoff_required|failed>
  --delivery-tool <tool-name>
  --id <request-id>
  --json
  --dry-run
  --yes, -y
`);
}

function printLanesWorkflowHelp() {
  console.log(`StarWork Multiagent Workflow

Usage:
  starwork multiagent workflow start --definition <path> --entry-node <node> --actor-lane <lane> --target <path> --json --yes
  starwork multiagent workflow status --run <run-id> --target <path> --json
  starwork multiagent workflow route --run <run-id> --event <event-json-or-key> --target <path> --json
  starwork multiagent workflow event record --run <run-id> --type <type> --status <status> --target <path> --json --yes

说明：
  workflow 只管理 run state、Step Router 和 event log，不调用宿主发送工具。
`);
}

function printLanesWorkflowStartHelp() {
  console.log(`StarWork Multiagent Workflow Start

Usage:
  starwork multiagent workflow start --definition <path> --entry-node <node> --actor-lane <lane> [options]

Options:
  --target <path>
  --definition <path>
  --entry-node <node>
  --actor-lane <lane>
  --id <run-id>
  --json
  --yes, -y
`);
}

function printLanesWorkflowStatusHelp() {
  console.log(`StarWork Multiagent Workflow Status

Usage:
  starwork multiagent workflow status --run <run-id> [options]

Options:
  --target <path>
  --run <run-id>
  --json
`);
}

function printLanesWorkflowRouteHelp() {
  console.log(`StarWork Multiagent Workflow Route

Usage:
  starwork multiagent workflow route --run <run-id> --event <event-json-or-key> [options]

Options:
  --target <path>
  --run <run-id>
  --event <event-json-or-key>
  --current-session <agent:session-id>
  --json

说明：
  route 只根据 Workflow Definition + Workflow Run State + completion event 计算下一步目标。
  命中 self-delivery guard 时写入 blocked event，不调用发送工具，不记录 delivered。
`);
}

function printLanesWorkflowEventRecordHelp() {
  console.log(`StarWork Multiagent Workflow Event Record

Usage:
  starwork multiagent workflow event record --run <run-id> --type <type> --status <status> [options]

Options:
  --target <path>
  --run <run-id>
  --type <type>
  --status <planned|ready|delivering|delivered|blocked_self_delivery|manual_confirmation_required|blocked_missing_route|manual_handoff_required|self_step_recorded|completed|failed>
  --message <text>
  --json
  --yes, -y
`);
}

function printLanesShareHelp() {
  console.log(`StarWork Multiagent Share

Usage:
  starwork multiagent share <from-lane> --title <title> --path <relative-path> --audience <lanes> [options]

Options:
  --target <path>
  --title <title>
  --path <relative-path>
  --audience <lane-list>
  --status <draft|ready|confirmed>
  --dry-run
  --yes, -y
`);
}

module.exports = { run };
