This repository is not a single project, but a collection of multiple
different experiments.

In order to facilitate work across these experiments, we would like to
set up a clear structure that looks like this:

|                            | Directory               | RL module                   |
|----------------------------|-------------------------|-----------------------------|
| **Shared components**      | resources/common        | ext.readerExperiments       |
| **Individual experiments** | resources/experiments/* | ext.readerExperiments/*     |
| **External libraries**     | resources/lib/*         | ext.readerExperiments/lib/* |

# Shared components

Code shared across multiple experiments is expected to go into the
`resources/common` directory, exported through its `index.js`
entrypoint, and accessible from the `ext.readerExperiments` ResourceLoader
module.

For these shared resources, we suggest implementing them in the relevant
experiment first (although if we can make it somewhat generic from the go,
all the better) and not move them into "common" until we have a 2nd
experiment where they will actually be re-used (to prevent premature
optimization when we can't properly assess re-use nuances yet)

# Individual experiments

Each distinct experiment is placed in a standalone subdirectory under
`resources/experiments`. The ResourceLoader module name will be
`ext.readerExperiments/<name>`, where the experiment name suffix matches
the directory name.

# External libraries

External libraries should be located in `resources/lib` and are managed
through `resources/lib/foreign-resources.yaml`.

In order to prevent conflicts with other extensions, we'll prefix the
ResourceLoader module names so that they look like
`ext.readerExperiments/lib/<name>`.
