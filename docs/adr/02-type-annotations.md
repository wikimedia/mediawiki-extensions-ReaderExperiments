# ADR 02: Type Annotations

## Status

Proposal

## Context

The MediaWiki front-end does not rely on any sort of Node.js build step (and
introducing one would be a significant architectural change). Some PHP tooling
is available for tasks like Less stylesheet compilation or performing basic
processing of Vue.js single-file components, but developers working in MediaWiki
core and extensions must manage without relying on front-end build tooling.
This excludes bundlers like Vite and Webpack[^1], as well as other languages that
compile to JS (including TypeScript).

Some of the engineers on the new Reader Growth team have previous experience
working full-time in a large TypeScript project: [Codex][1], the Design System
for Wikimedia. Vue.js (which Codex is built on top of) has very extensive
TypeScript support, which can lead to a much-improved developer experience.

Fortunately, it is now possible to use "real" TypeScript type definitions in
JSDoc type annotation comments (which are already widely used in MW front-end
code). This could provide the best of both worlds, where we would gain the
ability to benefit from TS-powered type hints in supporting editors like VSCode
without needing to introduce a complicated new build system that is at odds with
the MediaWiki way of doing things.


## Decision

Where necessary, we will define custom types in a top-level `types.d.ts` file
and reference them in JSDoc type annotation comments using `import()`. This
approach is not necessary for primitive types like `string` or `number` (which
are already handled by basic JSDoc functionality), but if we are building custom
data structures and passing them around then formal type definitions are
strongly encouraged.

For example: the ImageBrowsing prototype extracts image data from a given
article page and generates a custom data structure that is then used throughout
the rest of the application. An `ImageData` interface has been defined in the
`types.d.ts` file which documents the methods and properties available, and
consuming code can import that interface to use in annotations:

```js
/**
 * @param {import('../types').ImageData}
 */
function myFunction( image ) {
  // ...etc
}

// If you don't want to import the type each time
// a per-file typedef also works

/**
 * @typedef {import('../types').ImageData} ImageData
 */
```

When combined with Vue's own type definitions (which are comprehensive), we gain
the ability to add powerful type hinting and annotation to our component files
without needing any sort of front-end build system.

For example, when a typed object is passed as a prop to a given component, we can
use Vue's built-in `PropType<T>` generic. Editors that support the 
[Language Service Protocol (LSP)][2] will then become aware of the shape of that
prop and will provide hints accordingly.

```js
/**
 * @typedef {import('../types').ImageData} ImageData
 */

module.exports = exports = defineComponent( {
  name: 'FooComponent',
  props: {
    /**
     * @type {import('vue').PropType<ImageData>}
     */
    image: {
      type: /** @type {import('vue').PropType<ImageData>} */ ( Object ),
      required: true
    }
  }
} );
```

Now the `image` prop can be understood as an `ImageData` instance, instead of
just a generic `Object` (which is much less helpful).

We may also want to look at using a library like [types-mediawiki][3] to provide
proper TS definitions for various parts of the MediaWiki front-end API to
supplement this approach.

## Consequences

Using TypeScript within JSDoc annotations in this way will give us some of the
benefits of a more modern development experience without the overhead and
complexity. Hopefully this will help us understand the interfaces and
"contracts" between different parts of our code, which will in turn help us
maintain development velocity as we rapidly prototype new reader-facing features.

If we find this approach to be useful, we may want to write about it further and
encourage adoption of this technique more widely in MediaWiki front-end code.

[^1]: Some extensions like MobileFrontend and Popups actually do rely on a custom
  Webpack build process, but the consensus among Foundation developers is that
  this setup is more trouble than it's worth and we should move away from it.

[1]: https://doc.wikimedia.org/codex/latest/
[2]: https://microsoft.github.io/language-server-protocol/overviews/lsp/overview/
[3]: https://github.com/wikimedia-gadgets/types-mediawiki