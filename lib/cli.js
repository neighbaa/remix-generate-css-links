#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const meow_1 = __importDefault(require("meow"));
const path = __importStar(require("path"));
const chokidar_1 = __importDefault(require("chokidar"));
const dependencyTree = require('dependency-tree');
const { resolve } = require('path');
const { readdir, writeFile } = require('fs').promises;
const { ensureFile } = require('fs-extra');
const projectRoot = process.env.REMIX_ROOT || require("app-root-path");
const remixConfig = require(`${projectRoot}/remix.config`);
// ensure remixConfig is available at the project root dir
if (!remixConfig) {
    console.error("Cannot find remix.config.js. Check that this is a Remix.run project.");
    process.exit(1);
}
let OUTDIR = ".generated-css-links";
const helpText = `
Usage
$ remix-generate-css-links
Options
--watch, -w  Watch for routes changes
--outdir -o Provide app/<output directory name> for directory to output links files (default ${OUTDIR})
`;
const cli = (0, meow_1.default)(helpText, {
    // importMeta: import.meta,
    flags: {
        watch: {
            type: "boolean",
            alias: "w"
        },
        outdir: {
            type: "string",
            alias: "o"
        }
    }
});
if (typeof cli.flags.outdir === "string" && cli.flags.outdir.length)
    OUTDIR = cli.flags.outdir;
// determine app directory
const remixAppDirectory = remixConfig.appDirectory || "app";
const appdir = `${projectRoot}/${remixAppDirectory}`;
const appdirLength = appdir.length;
// include routes/ in filepath
const promiseMeAllStyleLinksInOneFile = async (filepath) => {
    const reducedList = [];
    dependencyTree.toList({
        filename: `${appdir}/${filepath}`,
        directory: `${appdir}/`,
        tsConfig: `${projectRoot}/tsconfig.json`,
        filter: (path) => path.indexOf('node_modules') === -1 && path.indexOf(OUTDIR) === -1,
    })
        .forEach((path) => {
        const pathCheck = path.substring(0, appdirLength);
        if (pathCheck === appdir && path.split(".").slice(-1)[0] === "css") {
            reducedList.push(`~${path.substring(appdirLength)}`);
        }
    });
    let data = `import type { HtmlLinkDescriptor } from "remix";
${reducedList.map((path, index) => `import _${index} from "${path}";`).join("\n")}

export const links = () => {
  const htmlLinkDescriptors: HtmlLinkDescriptor[] = [
    ${reducedList.map((path, index) => {
        return `{ rel: "stylesheet", href: _${index} }`;
    }).join(",\n    ")}
  ]
  return htmlLinkDescriptors
}

interface UniqueLinksHrefMap { [id: HtmlLinkDescriptor["href"]]: HtmlLinkDescriptor; }

export const mergeOtherLinks = (_links: HtmlLinkDescriptor[]) => {
  const uniqueLinksHrefMap: UniqueLinksHrefMap = {}
  _links.forEach(link => uniqueLinksHrefMap[link.href] = link)
  return _links.concat(links().filter(link => !uniqueLinksHrefMap[link.href]))
}
`;
    const generatedFileTarget = `app/${OUTDIR}}/${filepath.split(".").slice(0, -1).join(".")}.generated-links.ts`;
    await ensureFile(generatedFileTarget);
    await writeFile(generatedFileTarget, data);
};
async function processFileTree(dir) {
    const dirents = await readdir(dir, { withFileTypes: true });
    const subDirs = [];
    // handle files at top before subdirs
    await Promise.all(dirents.filter((dirent) => {
        if (dirent.isDirectory())
            subDirs.push(dirent);
        else
            return true;
    }).map(async (dirent) => {
        const fullPath = await resolve(dir, dirent.name);
        const pathFromAppDirectory = (fullPath).substring(appdirLength + 1);
        return await promiseMeAllStyleLinksInOneFile(pathFromAppDirectory);
    }));
    // handle subdirs
    await Promise.all(subDirs.map(async (dirent) => await processFileTree(await resolve(dir, dirent.name))));
}
const build = async () => {
    const appRootfilename = require.resolve(resolve(appdir, "root")).substring(appdirLength + 1);
    await promiseMeAllStyleLinksInOneFile(appRootfilename);
    await processFileTree(`${appdir}/routes`);
};
function watch() {
    chokidar_1.default.watch([path.join(projectRoot, 'app/routes/**/*.{ts,tsx}'), path.join(projectRoot, 'remix.config.js')]).on('change', () => {
        build();
    });
    console.log('Watching for changes in your app routes...');
}
if (require.main === module) {
    (async function () { await (cli.flags.watch ? watch : build)(); })();
}
