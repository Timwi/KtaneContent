# Linting Commits
If you want [RepoLint](https://github.com/samfundev/RepoLint) to lint your commits, you can setup a hook to do that when committing new changes.

## Step 1: Git
Run the following command in this repo to get git to look for the hook in the hooks directory.
```sh
git config core.hooksPath hooks
```

## Step 2: RepoLint
Clone [RepoLint](https://github.com/samfundev/RepoLint) using the following command.
```sh
git clone https://github.com/samfundev/RepoLint
```

To build it, you'll need [.NET Core](https://dotnet.microsoft.com/download/dotnet-core). Then you should be able to run the following command in the `RepoLint` directory to build RepoLint.
```sh
dotnet build -c Release
```

## Step 3: PATH
RepoLint needs to be added to the PATH so that it can be used by the hook to lint files. To do this, add the `RepoLint/bin/Release` directory to your PATH.