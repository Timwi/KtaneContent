# KTANE Content

This repository contains the files that are hosted on https://ktane.timwi.de/. It does not contain the software that runs the server; this is hosted in https://github.com/Timwi/KtaneWeb.

The various folders in this repository are:

## `HTML`, `PDF`

Contains HTML and PDF versions of all the KTANE module manuals and cheat sheets.

## `HTML/img`

Contains image files used _both_ by the manuals as well as the website proper. The component SVGs (the graphics in the top-right corner of every manual) are stored in `HTML/img/Component`. All other graphics for a specific manual are stored in a subfolder by the module’s name. The graphics directly in `HTML/img` are either shared by all manuals (e.g. the background images) or used by the website.

## `HTML/js`

Contains the JavaScript used by the manuals that enables the highlighting features, as well as external libraries such as jQuery UI.

## `Icons`

Contains the module icons. Each icon should be 32×32 pixels, use alpha transparency, and preferably be minimalized using pngcrush.

This folder does _not_ contain other UI icons used on the website. Those are in `HTML/img`.

## `More`

Contains the Logfile Analyzer, Profile Editor, Template Manual and a few other files.