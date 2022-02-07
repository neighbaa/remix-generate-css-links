
import type { Dirent } from "fs"
const dependencyTree = require('dependency-tree');
const { resolve } = require('path');
const { readdir, writeFile } = require('fs').promises;
const { ensureFile } = require('fs-extra');
const projectRoot = require("app-root-path")

const remixConfig = require(`${projectRoot}/remix.config`)

// ensure remixConfig is available at the project root dir
if(!remixConfig) {
  console.error("Cannot find remix.config.js. Are you sure this is a remix project?")
  process.exit(1)
}

// determine app directory
const remixAppDirectory = remixConfig.appDirectory || "app"
const appdir = `${projectRoot}/${remixAppDirectory}`
const appdirLength = appdir.length

// include routes/ in filepath
const promiseMeAllStyleLinksInOneFile = async (filepath: string) => {
const reducedList: any = []

dependencyTree.toList({
  filename: `${appdir}/${filepath}`,
  directory: `${appdir}/`,
  tsConfig: `${projectRoot}/tsconfig.json`,
  filter: (path: string) => path.indexOf('node_modules') === -1 && path.indexOf('_generatedRouteCSSLinks') === -1,
})
  .forEach((path: string) => {
    const pathCheck = path.substring(0,appdirLength)
    if(pathCheck === appdir && path.split(".").slice(-1)[0] === "css") {
      reducedList.push(`~${path.substring(appdirLength)}`)
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

const generatedFileTarget = `app/_generatedRouteCSSLinks/${filepath.split(".").slice(0,-1).join(".")}.generated_links.ts`
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
    return await promiseMeAllStyleLinksInOneFile(pathFromAppDirectory)
  }));
  // handle subdirs
  await Promise.all(subDirs.map(async (dirent: Dirent) => await processFileTree(await resolve(dir, dirent.name))))
}

const runWithAppRoot = async () => {
  const appRootfilename = require.resolve(resolve(appdir, "root")).substring(appdirLength+1)
  await promiseMeAllStyleLinksInOneFile(appRootfilename)
  await processFileTree(`${appdir}/routes`)
}

runWithAppRoot()

export {}