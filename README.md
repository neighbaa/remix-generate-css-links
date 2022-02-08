# remix-generate-css-links

`remix-generate-css-links` automatically generates links for your imported .css files. You get the convenience of importing css the way you do in regular React projects and still get the benefits of exporting links in your Remix.run project, the Remix way.

![Screenshot](https://user-images.githubusercontent.com/52981032/152796510-0ea4e317-a355-4573-a204-a5c769855722.png)

![Screenshot](https://user-images.githubusercontent.com/52981032/152798285-20e00249-3ea1-48fa-b13b-f801db8985f4.png)
![Screenshot](https://user-images.githubusercontent.com/52981032/152802365-19778b0e-2082-4647-9ee1-7688d589ff01.png)

![Screenshot](https://user-images.githubusercontent.com/52981032/152801788-22fb86bc-7296-4df2-b6c4-a9b4d2461864.png)


## Why would I use this?
- You want to use Remix, but you don't love all the options you have for styling, detailed here: https://remix.run/docs/en/v1/guides/styling
- You may find it tedious to track and write all of the css imports and link exports across your Remix components - especially if you have many nested components with independent styles.
- You appreciate the benefits of the Remix link system and you want to preserve those benefits, but you want an easier developer experience.
- You don't necessarily want to use Tailwind, or export the same large single css file on every page.

## Installation

- Using yarn:

```bash
$ yarn add --dev remix-generate-css-links
```

- Using npm:

```bash
$ npm install --save-dev remix-generate-css-links
```

## Setup

`package.json`

```json
{
  "scripts": {
    "build": "remix-generate-css-links && remix build",
    "dev": "concurrently \"remix-generate-css-links -w\" \"remix dev\""
  }
}
```

## Usage

`app/components/SomeWickedComponent.tsx`
```typescript
...
import './LocalStyle.css'; // <-- Import styles however you want. If you want, you can just import like this for side effects.
import '../../SomeOtherStyle.css';

// That's it. There's no need to export these as links like you would below. Though if you did, it would still work.
// export const links = () => {
//   return [
//     {
//       rel: "stylesheet",
//       href: LocalStyle
//     }
//   ]
// }

...
```

`app/routes/some-sweet-as-route`

- Basic
```typescript
...
// Generated files live in the app/.generated-css-links directory, unless you specify another directory the --outdir / -o flag.
// The directory structure is the same as the app/routes, with the ".generated-links" extension OR ~/.generated-css-links/<route-path>.generated-links
// So in this file, you would get its generated css links like below:
import { links as _links } from "~/.generated-css-links/routes/some-sweet-as-route.generated-links"

// Then you can export the links.
export const links = () => [..._links()];

// If you want to, you could skip importing and simply export the links directly.
export { links } from "~/.generated-css-links/routes/some-sweet-as-route.generated-links"

// You can also import css into this route file and it will safely be added to its own exported links
import "SomeSweetAsRouteStyle.css"
```

- Merge links
```typescript
...
// Additionally, you can use mergeOtherLinks to merge additional links to the exported route links without duplicating them.
import { mergeOtherLinks } from "~/.generated-css-links/routes/some-sweet-as-route.generated-links"

export const links: LinksFunction = () => {
  return mergeOtherLinks([
    {
      rel: "stylesheet",
      href: globalStylesUrl
    },
    {
      rel: "stylesheet",
      href: globalMediumStylesUrl,
      media: "print, (min-width: 640px)"
    },
    {
      rel: "stylesheet",
      href: globalLargeStylesUrl,
      media: "screen and (min-width: 1024px)"
    },
    {
      rel: "apple-touch-icon",
      href: appleTouch
    },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Days+One&display=swap",
    },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Heebo:wght@900&display=swap",
    }
  ]);
};

```

## Command Line Options

- `-w`: Watch for changes and automatically rebuild.
- `-o`: Change the output directory for the generated files. It will live at `app/<your-given-output-directory>`

## License

[MIT](LICENSE)
