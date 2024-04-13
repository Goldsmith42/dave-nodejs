# Dangerous Dave in Node.js

This is a Node.js TypeScript implementation of id Software's classic game, Dangerous Dave, inspired by MaiZure's C implementation and video series: https://github.com/MaiZure/lmdave/

This implementation goes about as far as MaiZure's did, but the end goal is to go further and finish the implementation. This is mostly intended as a programming exercise and requires you to build and run it in a development environment, though at some point in the future I may try using something like [single executable applications](https://nodejs.org/api/single-executable-applications.html#single-executable-applications) to build an executable.

See the `TODO` file for things that are on the roadmap.

## Usage

### Requirements

- [Node.js](https://nodejs.org/) must be installed. NPM should be available.
- You have to provide the original executable of the game (all assets will be extracted from the game files).

### Initializing the project.

Run `npm i` to install all of the required dependencies.

### Extracting the assets

Before running the game, you have to extract the original VGA graphics and level data from the game executable. To do this, you first need to use `UNLZEXE` to decompress the original `DAVE.EXE` file. MaiZure's videos provide instructions on how to do this using DOSBox, but it's much simpler to use a modern version of `UNLZEXE` for your system.

Next, you need to extract the assets. You can do this by running `npm run extract -- ./DAVE.EXENEW`, substituting `./DAVE.EXENEW` for the path to your uncompressed Dave executable. If you run `npm run extract` without specifying an executable argument, the script will attempt to read the file from `original-game/DAVE.EXENEW` in the project folder.

The assets will be extracted into the `assets` directory.

### Running the game

Once the assets have been extracted, you can start the game by running `npm start`.