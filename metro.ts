import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type MetroConfig = {
  projectRoot?: string;
  transformer?: {
    babelTransformerPath?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type WithZustandManagerOptions = {
  enabled?: boolean;
};

type TransformArgs = {
  src: string;
  filename: string;
  options?: unknown;
};

type Transformer = {
  transform: (args: TransformArgs) => unknown;
};

const require = createRequire(import.meta.url);
const THIS_MODULE_PATH = fileURLToPath(import.meta.url);
const UPSTREAM_TRANSFORMER_ENV = 'ROZENITE_ZUSTAND_MANAGER_UPSTREAM_TRANSFORMER';
const PROJECT_ROOT_ENV = 'ROZENITE_ZUSTAND_MANAGER_PROJECT_ROOT';

function getTransformerPath() {
  return THIS_MODULE_PATH;
}

function resolveDefaultTransformer(projectRoot = process.cwd()) {
  return require.resolve('@react-native/metro-babel-transformer', {
    paths: [projectRoot],
  });
}

function loadUpstreamTransformer(): Transformer {
  const projectRoot = process.env[PROJECT_ROOT_ENV] ?? process.cwd();
  const upstreamPath = process.env[UPSTREAM_TRANSFORMER_ENV];
  const resolvedPath = upstreamPath && upstreamPath !== THIS_MODULE_PATH ? upstreamPath : resolveDefaultTransformer(projectRoot);
  return require(resolvedPath) as Transformer;
}

function normalizeFilePath(filename: string) {
  const projectRoot = process.env[PROJECT_ROOT_ENV];
  if (!projectRoot) return filename;
  return path.relative(projectRoot, filename).split(path.sep).join('/');
}

function shouldTransform(filename: string, source: string) {
  if (filename.includes(`${path.sep}node_modules${path.sep}`)) return false;
  if (!/\.[cm]?[jt]sx?$/.test(filename)) return false;
  return source.includes('zustand') && source.includes('create');
}

function getZustandFactoryNames(source: string) {
  const names = new Set<string>();
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"](zustand|zustand\/vanilla)['"];?/g;
  let importMatch: RegExpExecArray | null;

  while ((importMatch = importRegex.exec(source)) !== null) {
    const [, specifiers, moduleName] = importMatch;
    specifiers.split(',').forEach((specifier) => {
      const parts = specifier.trim().split(/\s+as\s+/);
      const importedName = parts[0]?.trim();
      const localName = (parts[1] ?? parts[0])?.trim();
      const isFactory = moduleName === 'zustand' ? importedName === 'create' || importedName === 'createStore' : importedName === 'createStore';

      if (isFactory && localName) {
        names.add(localName);
      }
    });
  }

  return names;
}

function findStoreDeclarations(source: string, factoryNames: Set<string>) {
  if (factoryNames.size === 0) return [];

  const factoryPattern = Array.from(factoryNames)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const declarationRegex = new RegExp(String.raw`(?:^|\n)(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:${factoryPattern})(?:\s*<(?:[^<>]|<[^<>]*>)*>)?\s*\(`, 'g');
  const declarations: string[] = [];
  let declarationMatch: RegExpExecArray | null;

  while ((declarationMatch = declarationRegex.exec(source)) !== null) {
    declarations.push(declarationMatch[1]);
  }

  return Array.from(new Set(declarations));
}

export function __unstableTransformZustandSource(source: string, filename: string) {
  if (!shouldTransform(filename, source)) return source;

  const factoryNames = getZustandFactoryNames(source);
  const declarations = findStoreDeclarations(source, factoryNames);
  if (declarations.length === 0) return source;

  const file = normalizeFilePath(filename);
  const registrationImport = ["import { registerZustandStore as __rozeniteZustandRegisterStore } from 'rozenite-zustand-manager';"];
  const registrations = declarations.map((name) => `__rozeniteZustandRegisterStore({ name: ${JSON.stringify(name)}, file: ${JSON.stringify(file)}, store: ${name} });`);

  return `${registrationImport.join('\n')}\n${source}\n${registrations.join('\n')}\n`;
}

export function transform(args: TransformArgs) {
  const upstreamTransformer = loadUpstreamTransformer();
  return upstreamTransformer.transform({
    ...args,
    src: __unstableTransformZustandSource(args.src, args.filename),
  });
}

export function withZustandManager(config: MetroConfig | (() => MetroConfig | Promise<MetroConfig>) | Promise<MetroConfig>, options: WithZustandManagerOptions = {}) {
  return async () => {
    const resolvedConfig: MetroConfig = typeof config === 'function' ? await config() : await config;

    if (options.enabled === false) {
      return resolvedConfig;
    }

    const projectRoot = resolvedConfig.projectRoot ?? process.cwd();
    const upstreamTransformerPath = resolvedConfig.transformer?.babelTransformerPath;
    process.env[PROJECT_ROOT_ENV] = projectRoot;
    if (upstreamTransformerPath && upstreamTransformerPath !== getTransformerPath()) {
      process.env[UPSTREAM_TRANSFORMER_ENV] = upstreamTransformerPath;
    } else {
      delete process.env[UPSTREAM_TRANSFORMER_ENV];
    }

    return {
      ...resolvedConfig,
      transformer: {
        ...resolvedConfig.transformer,
        babelTransformerPath: getTransformerPath(),
      },
    };
  };
}
