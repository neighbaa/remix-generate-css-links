#!/usr/bin/env node
require('ts-node').register();

import util from 'util';
import meow from 'meow';
import chokidar from 'chokidar';
import type { Dirent } from "fs";

// const sass = require('sass-embedded');
const exec = util.promisify(require('child_process').exec);
const commandExists = require('command-exists');
const dependencyTree = require('dependency-tree');
const { resolve, join } = require('path');
const { readdir, writeFile } = require('fs').promises;
const { ensureFile } = require('fs-extra');

const projectRoot = process.env.REMIX_ROOT || require("app-root-path")
const remixConfig = require(`${projectRoot}/remix.config`)

// ensure remixConfig is available at the project root dir
if(!remixConfig) {
  console.error("Cannot find remix.config.js. Check that this is a Remix.run project.")
  process.exit(1)
}

let OUTDIR: string = ".generated-css-links"

const helpText = `
Usage
$ remix-generate-css-links
Options
--watch, -w  Watch for routes changes
--outdir -o <app dir>/<output directory name> for directory to output links files (default ${OUTDIR})
`;

const cli = meow(helpText, {
  // importMeta: import.meta,
  flags: {
    watch: {
      type: "boolean",
      alias: "w"
    },
    outdir: {
      type: "string",
      alias: "o"
    },
    sass: {
      type: "boolean"
    }
  }
});

if(typeof cli.flags.outdir === "string" && cli.flags.outdir.length) OUTDIR = cli.flags.outdir

// determine app directory
const remixAppDirectory = remixConfig.appDirectory || "app"
const appdir = `${projectRoot}/${remixAppDirectory}`
const nodeModulesDir = `${projectRoot}/node_modules/`
const appdirLength = appdir.length
const nodeModulesDirLength = nodeModulesDir.length

let sassCommand = false
const checkUseSass = async () => {
  if(!cli.flags.sass) return false
  try {
    sassCommand = await commandExists('sass')
  } catch(error) {
    console.error(`sass is not an available command - either make sass available from the command line, or remove the --sass option`)
    process.exit(0)
  }
}

// include routes/ in filepath
const allStyleLinksInOneFile = async (filepath: string) => {
  const reducedList: any = []
  
  dependencyTree.toList({
    filename: `${appdir}/${filepath}`,
    directory: `${appdir}/`,
    tsConfig: `${projectRoot}/tsconfig.json`,
    filter: (path: string) => (path.split(".").slice(-1)[0] === "css" || path.indexOf('node_modules') === -1) && path.indexOf(OUTDIR) === -1,
  })
    .forEach((path: string) => {
      if(path.split(".").slice(-1)[0] === "css") {
        if(path.substring(0,appdirLength) === appdir)
          reducedList.push(`~${path.substring(appdirLength)}`)
        else if (path.substring(0,nodeModulesDirLength) === nodeModulesDir)
          reducedList.push(path.substring(nodeModulesDirLength))
        else throw new Error(`Unexpected path prefix found: ${path}`)
      } 
    });
  
let data =
`import type { HtmlLinkDescriptor } from "remix";
${reducedList.map((path: string, index: number) => `import _${index} from "${path}";`).join("\n")}

export const links = () => {
  const htmlLinkDescriptors: HtmlLinkDescriptor[] = [
    ${reducedList.map((path: string, index: number) => {
      return `{ rel: "stylesheet", href: _${index} }`
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
  
  const generatedFileTarget = `${remixAppDirectory}/${OUTDIR}/${filepath.split(".").slice(0,-1).join(".")}.generated-links.ts`
  await ensureFile(generatedFileTarget);
  await writeFile(generatedFileTarget, data);
}
  
async function processFileTree(dir: string) {
  const dirents = await readdir(dir, { withFileTypes: true });
  const subDirs: Dirent[] = []
  // handle files at top before subdirs
  await Promise.all(dirents.filter((dirent: Dirent) => {
    if(dirent.isDirectory()) subDirs.push(dirent)
    else return true
  }).map(async (dirent: Dirent) => {
    const fullPath = await resolve(dir, dirent.name)
    const pathFromAppDirectory = (fullPath).substring(appdirLength+1)
    return await allStyleLinksInOneFile(pathFromAppDirectory)
  }));
  // handle subdirs
  await Promise.all(subDirs.map(async (dirent: Dirent) => await processFileTree(await resolve(dir, dirent.name))))
}

const debounce = (callback: Function, wait: number) => {
  let timeout: any = null
  return (...args: any) => {
    const next = () => callback(...args)
    clearTimeout(timeout)
    timeout = setTimeout(next, wait)
  }
}

const checkAndRunSassCommand = async (watching?: boolean) => {
  if(sassCommand) {
    const { stdout, stderr } = await exec(`sass ${watching ? "--watch " : " "}${remixAppDirectory}/:${OUTDIR}.sass-css/`);
  }
}

const build = async (watching?: boolean) => {
  if(!watching) await checkAndRunSassCommand()

  const appRootfilename = require.resolve(resolve(appdir, "root")).substring(appdirLength+1)
  await allStyleLinksInOneFile(appRootfilename)
  await processFileTree(`${appdir}/routes`)
}

const debouncedBuild = debounce(build, 200)

function watch() {
  checkAndRunSassCommand(true)
  debouncedBuild(true);
  const projectRoutes = join(`${projectRoot}`, `${remixAppDirectory}/routes/**/*.{js,jsx,ts,tsx}`)
  const projectConfig = join(`${projectRoot}`, 'remix.config.js')
  chokidar.watch([projectRoutes, projectConfig]).on('change', () => {
      debouncedBuild(true);
  });
  console.log('Watching for changes in your app routes...');
}

if (require.main === module) {
  (async function () { await checkUseSass(); await (cli.flags.watch ? watch : debouncedBuild )() })();
}
