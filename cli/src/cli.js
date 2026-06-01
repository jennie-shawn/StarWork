const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { spawnSync } = require("child_process");

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
    label: "Codex",
    path: null
  },
  claude: {
    label: "Claude Code",
    path: "CLAUDE.md"
  },
  cursor: {
    label: "Cursor",
    path: path.join(".cursor", "rules", "starwork.mdc")
  },
  trae: {
    label: "Trae",
    path: path.join(".trae", "rules", "starwork.md")
  }
};

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
    enableKnowledge: Boolean(options.knowledge)
  });

  printPlan(plan, options.dryRun);

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
  console.log("");
  console.log("StarWork 工作台已创建。");
  console.log("");
  console.log("下一步建议：");
  console.log(`1. 运行 starwork doctor --target ${plan.targetDir}`);
  if (workspaceType === "hub") {
    console.log("2. 打开 README.md 和 AGENTS.md，确认这个项目中心的管理边界。");
    console.log("3. 需要创建项目时，先用 starworkSpawn 设计，或直接运行 starwork spawn。");
    console.log("4. 创建项目后，运行 starwork audit 巡检项目中心里的项目登记。");
  } else {
    console.log("2. 打开 AGENTS.md，确认 AI 入口规则。");
    console.log("3. 如需生成特定 AI 工具适配文件，运行 starwork adapt。");
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
      options.host = true;
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
    } else if (arg === "--message") {
      options.message = readValue(argv, ++i, arg);
    } else if (arg === "--turns") {
      options.turns = readValue(argv, ++i, arg);
    } else if (arg === "--timeout") {
      options.timeout = readValue(argv, ++i, arg);
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

  const targetDir = path.resolve(options.target || process.cwd());
  const workspaceRoot = requireWorkspaceRoot(targetDir);
  const state = readWorkspaceState(workspaceRoot);
  const agent = options.agent || options._?.[0] || "codex";
  const agents = agent === "all" ? Object.keys(ADAPTERS) : [agent];

  for (const id of agents) {
    if (!ADAPTERS[id]) {
      throw new Error(`不支持的 Agent 适配目标：${id}`);
    }
  }

  const health = doctorCollect(workspaceRoot);
  if (health.summary.fail > 0) {
    throw new Error("当前工作台未通过 doctor 检查，请先修复阻塞问题。");
  }

  const plan = buildAdaptPlan({ workspaceRoot, state, agents });
  printGenericPlan(options.dryRun ? "适配预览（dry run）：" : "适配计划：", plan.actions);

  if (options.dryRun) return;
  await confirmOrThrow(options, "是否执行适配？");
  applyPlan(plan);
  console.log("");
  console.log("StarWork Agent 适配已完成。");
  console.log("下一步建议：运行 starwork doctor 再检查一次工作台。");
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
    lanesStatus(argv.slice(1));
    return;
  }
  if (subcommand === "read") {
    lanesRead(argv.slice(1));
    return;
  }
  if (subcommand === "instruct") {
    await lanesInstruct(argv.slice(1));
    return;
  }
  if (subcommand === "launch") {
    await lanesLaunch(argv.slice(1));
    return;
  }
  if (subcommand === "share") {
    await lanesShare(argv.slice(1));
    return;
  }

  throw new Error(`未知 multiagent 子命令：${subcommand}`);
}

async function lanesInit(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printLanesInitHelp();
    return;
  }
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
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
  const registry = readLanesRegistry(workspaceRoot);
  const lane = findLaneOrThrow(registry.lanes, laneId);
  const session = resolveLaneSession(options);
  if (lane.current_session && lane.current_session !== "unbound" && lane.current_session !== session && !options.yes) {
    throw new Error(`Lane ${laneId} 已绑定 ${lane.current_session}。如需覆盖，请传入 --yes。`);
  }
  const nextLanes = registry.lanes.map((item) => item.lane === laneId ? { ...item, current_session: session } : item);
  const lanesState = readAgentLanesState(workspaceRoot);
  const nextLanesState = updateAgentLaneHostState(lanesState, laneId, {
    host: extractCodexThreadId(session) ? "codex" : (options.agent || "manual"),
    current_session: session,
    thread_id: extractCodexThreadId(session),
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
      console.log(`将尝试同步宿主会话名：${sessionName}（best effort）`);
      console.log("");
    }
    if (options.pin) {
      console.log("将尝试置顶 Codex thread（best effort；当前 Codex 版本可能不支持）。");
      console.log("");
    }
  }
  if (options.dryRun) return;
  await confirmOrThrow(options, `是否将当前会话绑定到 Lane ${laneId}？`);
  applyPlan(plan);
  const sessionNameSync = renameHostSessionBestEffort({ session, sessionName });
  const pinSync = pinHostThreadBestEffort({ session, requested: Boolean(options.pin) });
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

function lanesStatus(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printLanesStatusHelp();
    return;
  }
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
  const registry = readLanesRegistry(workspaceRoot);
  const shared = readSharedContext(workspaceRoot);
  if (options.host) {
    const report = collectLanesHostStatus(workspaceRoot, registry, { load: Boolean(options.load) });
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
      cross_lane_requests: shared.requests
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
}

function collectLanesHostStatus(workspaceRoot, registry, options = {}) {
  const lanesState = readAgentLanesState(workspaceRoot);
  const lanes = registry.lanes.map((lane) => {
    const hostState = lanesState.lanes?.[lane.lane] || {};
    const threadId = hostState.thread_id || extractCodexThreadId(hostState.current_session || lane.current_session);
    const host = threadId
      ? observeCodexThread({ threadId, includeTurns: false, load: Boolean(options.load) })
      : {
          adapter: "none",
          readable: false,
          status: "unbound",
          warning: "Lane has no Codex thread binding",
          ui_visibility: "not_guaranteed"
        };
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
  });
  return {
    schema: "starwork.agent_lanes.host_status.v0.2",
    workspace_root: workspaceRoot,
    lanes
  };
}

function printLanesHostStatus(report) {
  console.log("");
  console.log("StarWork 多 AI 协作状态（含 Codex host observation）");
  console.log("");
  for (const item of report.lanes) {
    console.log(`- ${item.lane}`);
    console.log(`  StarWork state: ${item.starwork.bound ? item.starwork.session : "unbound"}；worklog=${item.starwork.worklog}；write_scope=${item.starwork.write_scope}`);
    if (item.starwork.warning) console.log(`  Warning: ${item.starwork.warning}`);
    console.log(`  Codex host observation: ${item.host.status}${item.host.name ? `；name=${item.host.name}` : ""}${item.host.cwd ? `；cwd=${item.host.cwd}` : ""}${Number.isInteger(item.host.turn_count) ? `；turns=${item.host.turn_count}` : ""}`);
    if (item.host.status === "notLoaded") {
      console.log("  说明：notLoaded 表示 thread 可能存在于历史中，但当前 app-server 尚未加载；可显式使用 --load。");
    }
    if (item.host.warning) console.log(`  Warning: ${item.host.warning}`);
  }
  console.log("");
  console.log("提示：这是 Codex host observation；正式交接仍以 lane worklog 和 shared outputs 为准。");
}

function lanesRead(argv) {
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
  const threadId = lanesState.lanes?.[laneId]?.thread_id || extractCodexThreadId(lanesState.lanes?.[laneId]?.current_session || lane.current_session);
  if (!threadId) throw new Error(`Lane ${laneId} 没有绑定 Codex thread。`);
  const turnLimit = options.turns ? Number.parseInt(options.turns, 10) : 0;
  if (options.turns && (!Number.isInteger(turnLimit) || turnLimit < 1)) {
    throw new Error("--turns 必须是正整数。");
  }
  const observation = observeCodexThread({ threadId, includeTurns: Boolean(options.includeTurns || turnLimit), load: false, turnLimit });
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
  console.log(`Lane ${laneId} 的 Codex host observation`);
  console.log("");
  console.log(`状态：${observation.status}`);
  if (observation.name) console.log(`标题：${observation.name}`);
  if (observation.cwd) console.log(`cwd：${observation.cwd}`);
  if (Number.isInteger(observation.turn_count)) console.log(`turn 数：${observation.turn_count}`);
  if (observation.turns?.length) {
    console.log("");
    console.log(`最近 ${observation.turns.length} 个 turns：`);
    for (const turn of observation.turns) {
      console.log(`- ${turn.id || "(unknown turn)"} ${turn.status || ""}`.trim());
    }
  }
  if (observation.warning) console.log(`Warning: ${observation.warning}`);
  console.log("");
  console.log("这是 Codex host observation。正式交接仍以 lane worklog 和 shared outputs 为准。");
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
  const threadId = lanesState.lanes?.[toLane]?.thread_id || extractCodexThreadId(lanesState.lanes?.[toLane]?.current_session || targetLane.current_session);
  const dryRunRequest = buildSharedRequestRow({
    id: requestId,
    from: fromLane,
    to: toLane,
    request: options.message,
    status: threadId ? "recorded" : "needs_manual_delivery",
    hostDelivery: threadId ? "pending" : "none",
    link: collaboration.shared
  });
  const shared = readSharedContext(workspaceRoot);
  const dryPlan = buildSharedContextPlan(workspaceRoot, {
    outputs: shared.outputs,
    requests: [...shared.requests, dryRunRequest],
    agreements: shared.agreements
  });
  if (options.json && options.dryRun) {
    console.log(JSON.stringify({ schema: "starwork.agent_lanes.instruct.v0.2", dry_run: true, request: dryRunRequest, formatted_message: message }, null, 2));
    return;
  }
  if (!options.json) {
    printGenericPlan(options.dryRun ? "跨会话指令预览（dry run）：" : "跨会话指令计划：", dryPlan.actions);
    if (threadId) console.log(`将发送到 Codex thread：${threadId}`);
    else console.log("目标 lane 没有 Codex thread，将只记录为 needs_manual_delivery。");
    console.log("");
  }
  if (options.dryRun) return;
  await confirmOrThrow(options, `是否向 Lane ${toLane} 发送指令？`);
  const delivery = threadId
    ? sendCodexInstruction({ threadId, message, timeout: parsePositiveInt(options.timeout, 30000) })
    : { adapter: "codex", status: "needs_manual_delivery", thread_id: null, warning: "Target lane has no Codex thread" };
  const finalRequest = buildSharedRequestRow({
    id: requestId,
    from: fromLane,
    to: toLane,
    request: options.message,
    status: delivery.status === "completed" ? "completed" : delivery.status === "sent" ? "sent" : delivery.status,
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
    console.log(JSON.stringify({ schema: "starwork.agent_lanes.instruct.v0.2", request: finalRequest, host_delivery: delivery }, null, 2));
    return;
  }
  console.log("");
  console.log(`已记录跨 lane 指令：${requestId}`);
  console.log(`Host delivery：${delivery.status}${delivery.warning ? ` (${delivery.warning})` : ""}`);
}

async function lanesLaunch(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printLanesLaunchHelp();
    return;
  }
  const workspaceRoot = requireWorkspaceRoot(path.resolve(options.target || process.cwd()));
  const state = readWorkspaceState(workspaceRoot);
  const collaboration = getCollaborationPaths(state);
  const registry = readLanesRegistry(workspaceRoot);
  const laneIds = options.lanes ? parseLaneList(options.lanes) : [normalizeLaneId(options._?.[0], "lane")];
  const lanes = laneIds.map((laneId) => findLaneOrThrow(registry.lanes, laneId));
  const actions = [];
  const launchResults = [];
  if (options.dryRun) {
    for (const lane of lanes) {
      launchResults.push({ lane: lane.lane, dry_run: true, message: renderMultiagentLaunchMessage({ lane, fromLane: options.from || "user", workspaceRoot, collaboration }) });
    }
    if (options.json) {
      console.log(JSON.stringify({ schema: "starwork.agent_lanes.launch.v0.2", dry_run: true, launches: launchResults }, null, 2));
      return;
    }
    console.log("");
    console.log("Codex lane launch 预览（dry run）：");
    lanes.forEach((lane) => console.log(`- ${lane.lane}`));
    return;
  }
  await confirmOrThrow(options, `是否 launch ${lanes.length} 个 Codex lane thread？`);
  let nextRegistryLanes = registry.lanes;
  let lanesState = readAgentLanesState(workspaceRoot);
  for (const lane of lanes) {
    const launchMessage = renderMultiagentLaunchMessage({ lane, fromLane: options.from || "user", workspaceRoot, collaboration });
    const launch = launchCodexLane({ message: launchMessage, timeout: parsePositiveInt(options.timeout, 30000) });
    const session = launch.thread_id ? `codex:${launch.thread_id}` : "unbound";
    if (launch.thread_id) {
      const sessionNameSync = renameHostSessionBestEffort({ session, sessionName: normalizeMarkdownCell(options.sessionName || "") });
      const pinSync = pinHostThreadBestEffort({ session, requested: Boolean(options.pin) });
      nextRegistryLanes = nextRegistryLanes.map((item) => item.lane === lane.lane ? { ...item, current_session: session } : item);
      lanesState = updateAgentLaneHostState(lanesState, lane.lane, {
        host: "codex",
        current_session: session,
        thread_id: launch.thread_id,
        session_name: normalizeMarkdownCell(options.sessionName || ""),
        pinned: pinSync.status === "ok",
        pin_status: pinSync.status,
        created_by: "starwork multiagent launch",
        created_at: new Date().toISOString(),
        last_host_status: {
          type: launch.status,
          observed_at: new Date().toISOString()
        }
      });
      launch.session_name_sync = sessionNameSync;
      launch.pin_sync = pinSync;
    }
    launchResults.push({ lane: lane.lane, ...launch });
  }
  actions.push(...buildLanesRegistryPlan(workspaceRoot, nextRegistryLanes).actions);
  actions.push(stateFileAction(workspaceRoot, lanesState));
  applyPlan({ targetDir: workspaceRoot, actions: dedupeActions(actions) });
  if (options.json) {
    console.log(JSON.stringify({ schema: "starwork.agent_lanes.launch.v0.2", launches: launchResults }, null, 2));
    return;
  }
  console.log("");
  launchResults.forEach((result) => console.log(`Lane ${result.lane}: ${result.status}${result.thread_id ? ` (${result.thread_id})` : ""}${result.warning ? ` - ${result.warning}` : ""}`));
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
  console.log(`其他职责位可以查看：_系统/协作/shared.md，并按受众范围读取 ${row.path}`);
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
        addCheck(result, "workspace.state.exists", "fail", "当前目录不是 StarWork 工作台。请先运行 starwork init。");
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
    throw new Error("当前目录不是 StarWork 工作台。请先运行 starwork init。");
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

function buildAdaptPlan({ workspaceRoot, state, agents }) {
  const actions = [];
  for (const agent of agents) {
    const config = ADAPTERS[agent];
    if (!config.path) continue;
    actions.push(overwriteFileAction(workspaceRoot, config.path, renderAdapterContent(agent, state)));
  }

  const nextState = {
    ...state,
    adapters: mergeInstalledRecords(state.adapters, agents)
  };
  actions.push(overwriteFileAction(workspaceRoot, path.join(".starwork", "workspace.json"), `${JSON.stringify(nextState, null, 2)}\n`));

  return {
    targetDir: workspaceRoot,
    actions: dedupeActions(actions)
  };
}

function renderAdapterContent(agent, state) {
  const rolePaths = getCoreRolePaths(state);
  const adapterName = ADAPTERS[agent].label;
  if (agent === "cursor") {
    return `---\ndescription: StarWork workspace rules\nalwaysApply: true\n---\n\n# StarWork Adapter for ${adapterName}\n\nThis workspace follows StarWork Core ${state.core || "0.1"}.\n\nRead first:\n\n1. AGENTS.md\n2. ${rolePaths.projectStatus}\n3. ${rolePaths.currentWork}\n\nFollow AGENTS.md as the source of truth. Do not overwrite user content silently.\n`;
  }
  return `# StarWork Adapter for ${adapterName}\n\nThis workspace follows StarWork Core ${state.core || "0.1"}.\n\n## Read First\n\n1. AGENTS.md\n2. ${rolePaths.projectStatus}\n3. ${rolePaths.currentWork}\n\n## Rule\n\nAGENTS.md is the source of truth. This file is only an adapter entrypoint for ${adapterName}.\n\nDo not overwrite user content silently. When unsure, ask before changing identity, lessons, shared knowledge, formal outputs, or synced repository content.\n`;
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
  const skills = {
    project_manifest: {
      exists: fs.existsSync(manifestPath),
      path: ".starwork/skills.json",
      count: 0
    },
    registry: null,
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
      const manifestSkills = Array.isArray(manifest.skills) ? manifest.skills : [];
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
    const registryRelativePath = path.join(hubPaths.formalSkills, "registry.json");
    const registryPath = path.join(workspaceRoot, registryRelativePath);
    skills.registry = {
      exists: fs.existsSync(registryPath),
      path: registryRelativePath,
      count: 0
    };
    if (!skills.registry.exists) {
      addCheck(result, "skills.registry.exists", "warn", "项目中心缺少托管 Skill 注册表。", registryRelativePath);
      return;
    }
    addCheck(result, "skills.registry.exists", "pass", "Project Center skill registry exists", registryRelativePath);
    let registry;
    try {
      registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    } catch (error) {
      addCheck(result, "skills.registry.parse", "fail", `无法解析项目中心 Skill registry：${error.message}`, registryRelativePath);
      return;
    }
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
      checkPathExists(result, workspaceRoot, path.join(hubPaths.formalSkills, skill.id), "skills.registry.source.exists", `Project Center skill source exists: ${skill.id}`, `项目中心托管 Skill 缺少目录：${path.join(hubPaths.formalSkills, skill.id)}`);
    }
  }
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
  return String(message || "")
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
  console.log("StarWork 初始化向导");
  console.log("");
  console.log(`目标目录：${targetDir}`);
  console.log("我会先确认工作台类型、语言和 Pack，然后给出写入预览。");
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

function buildInitPlan({ targetDir, workspaceName, workspaceType, workspaceConfig, pack, formalSource, businessWorkArea, blueprint = null, includeSkills = true, enableKnowledge = false }) {
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

function parseLaneList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => normalizeLaneId(item, "lanes"));
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
    return normalizeMarkdownCell(options.session);
  }
  const agent = options.agent || "codex";
  if (agent === "codex" && process.env.CODEX_THREAD_ID) {
    return `codex:${process.env.CODEX_THREAD_ID}`;
  }
  throw new Error("无法自动识别当前会话。请传入 --session <agent:session-id>。");
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

function renameHostSessionBestEffort({ session, sessionName }) {
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

function renameCodexThreadBestEffort({ threadId, sessionName }) {
  const request = [
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        clientInfo: {
          name: "starwork",
          version: PACKAGE_VERSION
        },
        capabilities: null
      }
    },
    {
      jsonrpc: "2.0",
      id: 2,
      method: "thread/name/set",
      params: {
        threadId,
        name: sessionName
      }
    }
  ].map((message) => JSON.stringify(message)).join("\n") + "\n";

  const result = spawnSync("codex", ["app-server", "--listen", "stdio://"], {
    input: request,
    encoding: "utf8",
    timeout: 5000
  });
  if (result.error) {
    return createSessionNameSyncResult({
      requested: true,
      supported: true,
      status: "warning",
      name: sessionName,
      warning: result.error.message
    });
  }
  if (result.status !== 0) {
    return createSessionNameSyncResult({
      requested: true,
      supported: true,
      status: "warning",
      name: sessionName,
      warning: (result.stderr || `codex app-server exited with status ${result.status}`).trim()
    });
  }
  const response = parseJsonRpcResponse(result.stdout, 2);
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

function observeCodexThread({ threadId, includeTurns = false, load = false, turnLimit = 0 }) {
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
  const result = runCodexAppServer(messages, { timeout: 5000 });
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

function readCodexThread(threadId, options = {}) {
  return observeCodexThread({ threadId, includeTurns: Boolean(options.includeTurns), load: false, turnLimit: options.turnLimit || 0 });
}

function resumeCodexThread(threadId) {
  return runCodexAppServer([
    codexInitializeMessage(1),
    { jsonrpc: "2.0", id: 2, method: "thread/resume", params: { threadId, excludeTurns: true } }
  ], { timeout: 5000 });
}

function startCodexTurn(threadId, formattedMessage, options = {}) {
  return sendCodexInstruction({ threadId, message: formattedMessage, timeout: options.timeout || 30000 });
}

function listCodexThreads(options = {}) {
  const result = runCodexAppServer([
    codexInitializeMessage(1),
    { jsonrpc: "2.0", id: 2, method: "thread/list", params: {} }
  ], { timeout: options.timeout || 5000 });
  if (!result.ok) return { ok: false, warning: result.warning, threads: [] };
  const response = result.responses.find((item) => item.id === 2);
  if (!response || response.error) return { ok: false, warning: response?.error?.message || "Codex thread/list failed", threads: [] };
  return { ok: true, threads: response.result?.threads || response.result || [] };
}

function sendCodexInstruction({ threadId, message, timeout }) {
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
        input: [{ type: "text", text: message }]
      }
    },
    {
      jsonrpc: "2.0",
      id: 5,
      method: "thread/read",
      params: { threadId, includeTurns: true }
    }
  ];
  const result = runCodexAppServer(messages, { timeout });
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
  const completed = result.events.find((item) => item.method === "turn/completed");
  const started = result.events.find((item) => item.method === "turn/started");
  const finalRead = result.responses.find((item) => item.id === 5);
  return {
    adapter: "codex",
    status: completed ? "completed" : "sent",
    thread_id: threadId,
    turn_id: completed?.params?.turnId || completed?.params?.turn?.id || started?.params?.turnId || started?.params?.turn?.id || start.result?.turnId || null,
    completed_at: completed ? new Date().toISOString() : null,
    verified_by_thread_read: Boolean(finalRead && !finalRead.error),
    ui_visibility: "not_guaranteed"
  };
}

function launchCodexLane({ message, timeout }) {
  const messages = [
    codexInitializeMessage(1),
    {
      jsonrpc: "2.0",
      id: 2,
      method: "thread/start",
      params: {}
    }
  ];
  const start = runCodexAppServer(messages, { timeout });
  if (!start.ok) return { adapter: "codex", status: "failed", warning: start.warning };
  const response = start.responses.find((item) => item.id === 2);
  if (!response || response.error) {
    return { adapter: "codex", status: "failed", warning: response?.error?.message || "Codex thread/start failed" };
  }
  const threadId = response.result?.threadId || response.result?.thread?.id || response.result?.id;
  if (!threadId) return { adapter: "codex", status: "failed", warning: "Codex thread/start did not return thread id" };
  const delivery = sendCodexInstruction({ threadId, message, timeout });
  return {
    adapter: "codex",
    status: delivery.status,
    thread_id: threadId,
    turn_id: delivery.turn_id || null,
    warning: delivery.warning || null,
    ui_visibility: "not_guaranteed"
  };
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

function runCodexAppServer(messages, options = {}) {
  const request = messages.map((message) => JSON.stringify(message)).join("\n") + "\n";
  const result = spawnSync("codex", ["app-server", "--listen", "stdio://"], {
    input: request,
    encoding: "utf8",
    timeout: options.timeout || 10000
  });
  if (result.error) {
    return { ok: false, warning: result.error.message, responses: [], events: [] };
  }
  if (result.status !== 0) {
    return { ok: false, warning: (result.stderr || `codex app-server exited with status ${result.status}`).trim(), responses: [], events: [] };
  }
  const messagesOut = parseJsonRpcMessages(result.stdout);
  return {
    ok: true,
    responses: messagesOut.filter((message) => Object.hasOwn(message, "id")),
    events: messagesOut.filter((message) => message.method)
  };
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
  const creates = plan.actions.filter((action) => action.mode === "create");
  const emptyUpdates = plan.actions.filter((action) => action.mode === "overwrite-empty");
  const createNew = plan.actions.filter((action) => action.mode === "create-new");

  console.log("");
  console.log(dryRun ? "创建工作台预览：" : "创建工作台计划：");
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

  if (creates.length) {
    console.log("会创建这些文件或文件夹：");
    creates.slice(0, 40).forEach((action) => console.log(`- ${action.relativePath}`));
    if (creates.length > 40) console.log(`- ... 另有 ${creates.length - 40} 项`);
    console.log("");
  }
  if (emptyUpdates.length) {
    console.log("会补充这些空文件：");
    emptyUpdates.forEach((action) => console.log(`- ${action.relativePath}`));
    console.log("");
  }
  if (createNew.length) {
    console.log("发现已有同名文件，不会覆盖，会另存为：");
    createNew.forEach((action) => console.log(`- ${path.relative(plan.targetDir, action.originalTarget)} -> ${action.relativePath}`));
    console.log("");
  }
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

创建一个 StarWork 工作台。v0.1 中，项目工作台默认加入通用工作能力；
项目中心会自动加入项目中心管理能力。

Options:
  --type <project|hub>
      project 创建项目工作台；hub 创建项目中心
  --pack <general|content-creator|hub-management|path>
  --language <zh|en>
  --name <name>
  --blueprint <init-blueprint.json>
  --formal-source <path>
  --knowledge
      初始化时同时开启项目知识库。默认不开启。
  --target <path>
  --dry-run
  --no-skills
  --yes, -y

示例：
  starwork init --type project --pack general --language zh --target ./my-workspace --yes
  starwork init --target ./custom-workspace --blueprint ./init-blueprint.json --dry-run
  starwork init --type hub --language zh --target ./my-hub --yes
  starwork init --type project --language zh --target ./my-workspace --knowledge --yes
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
  --json
  --strict
  --verbose
  --inventory-depth <number|all>
  --inventory-limit <number>

示例：
  starwork doctor --target ./my-workspace
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
  starwork adapt [codex|claude|cursor|trae|all] [options]

Options:
  --agent <codex|claude|cursor|trae|all>
  --target <path>
  --dry-run
  --yes, -y

示例：
  starwork adapt claude --target ./my-workspace --yes
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
  starwork multiagent <init|add|bind|release|status|read|instruct|launch|share> [options]

Agent Lanes 用于同一项目内多个 Agent 会话按项目自定义职责位协作。

Subcommands:
  init       创建 Agent Lanes 协作文件。
  add        新增一个 lane。
  bind       将当前会话绑定到 lane。
  release    释放 lane 的当前会话绑定。
  status     查看 lane 分工和共享请求，可加 --host 观察 Codex thread。
  read       读取某个 lane 绑定的 Codex thread 近况。
  instruct   向另一个 lane 发送格式化跨会话指令。
  launch     为已有 lane 创建并绑定 Codex thread。
  share      登记一个跨 lane 可读输出。

示例：
  starwork multiagent init --lanes research,writing,review --target ./my-workspace --yes
  starwork multiagent add review --purpose "审校和风险检查" --write "reviews/**,product/docs/**" --target ./my-workspace --yes
  starwork multiagent bind research --session codex:manual-research-1 --session-name "Research Agent" --target ./my-workspace --yes
  starwork multiagent status --host --target ./my-workspace --json
  starwork multiagent instruct development --from product-planning --message "请根据 SPEC 开始实现。" --target ./my-workspace --yes
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
  --session-name 会在绑定成功后 best-effort 同步宿主工具的会话名称。
  --pin 会尝试置顶 Codex thread；当前无稳定接口时只输出 warning，不回滚绑定。
  当前仅 Codex session 支持；失败不会回滚 lane binding。
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
  --json
  --dry-run
  --yes, -y
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
  --session-name <name>
  --pin
  --timeout <ms>
  --json
  --dry-run
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
