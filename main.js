const electron = require('electron');
const url = require('url');
const path = require('path');

const {app, BrowserWindow, Menu, ipcMain, dialog} = electron;

let mainWindow;
let sidebarWindow;

// listen for app to be ready

var listOfPages = [];
var keys = [];

var level = 0;
var minimumDepth = 10;

var keyDrawPile = [
    "Poem",
    "Novel",
    "Film",
    "Mammal",
    "Board game",
    "Video game",
    "Newspaper",
    "Song",
    "War",
    "Island",
    "Disease",
    "Monarch",
    "Rocket",
    "Missile",
    "Lake",
    "Sport",
    "Martial art",
    "Disaster",
    "Bay",
    "Bird",
    "Park",
    "Train",
    "Aircraft",
    "River",
    "Fruit",
    "Instrument",
    "Cocktail",
    "Reptile",
    "Mountain",
    "Religion",
    "Dinosaur",
    "Monster",
];

const startingPage = "https://en.wikipedia.org/wiki/Special:RandomInCategory/Category:Featured_articles";

var stepsRemaining = 10;

ipcMain.handle('restart-level', async(event, arg) => {
    restartLevel();
    return "ok";
});

function restartLevel() {
    startOfRound = "";
    stepsRemaining = 10;
    if(listOfPages.length > 0) {
        startOfRound = listOfPages[0];
    } else {
        startOfRound = startingPage;
    }
    listOfPages.length = 0;
    for(var i = 0; i < keys.length; i++) {
        keys[i].found = false;
    }
    mainWindow.loadURL(startOfRound);
}

function newLevel() {
    stepsRemaining = 10;
    listOfPages.length = 0;
    startOfRound = startingPage;
    mainWindow.loadURL(startOfRound);
}

ipcMain.handle('new-level', async(event, arg) => {
    newLevel();
    return "ok";
});

ipcMain.on('categories-on-page', (event, arg) => {
    if(listOfPages.length <= 1) {
        return;
    }
    console.log("categories", arg);
    arg.push(listOfPages[listOfPages.length-1]);
    for(const cat of arg) {
        if(cat == "Categories") {
            continue;
        }
        if(cat == "Featured articles") {
            continue;
        }
        if(cat.includes("Wikipedia")) {
            continue;
        }
        if(cat.includes("Wikidata")) {
            continue;
        }
        for(const key of keys) {
            if(key.found) {
                continue;
            }
            const matchKey = new RegExp('\\b'+(key.name)+'s?\\b', 'i');

            if(matchKey.test(cat)) {
                console.log("found key ", key.name, " in ", cat);
                key.found = true;
                stepsRemaining += 10;
                sidebarWindow.webContents.send("found-key", { key: key.name, pageName: listOfPages[listOfPages.length-1], stepsRemaining: stepsRemaining });
                dialog.showMessageBox(
                    mainWindow, {
                        message: "Completed a Quest! '" + key.name + "' found in '" + cat + "'\n10 Extra steps gained!",
                        type: "info",
                        buttons: [
                            "OK",
                        ],
                        defaultId: 0,
                        title: "Completed a Quest",
                    }
                )
            }
        }
    }
});

app.on('ready', function() {
    // create new window
    mainWindow = new BrowserWindow({
        //kiosk: true,
        title: "Wiki Vortex",
        webPreferences: {
            preload: path.join(app.getAppPath(), "preload.js"),
        }
    });

    mainWindow.loadURL(`file://${__dirname}/loading.html`);

    sidebarWindow = new BrowserWindow({
        width: 200,
        height: 500,
        parent: mainWindow,
        title: "Vortex History",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
        //frame: false,
    });


    // load html into window
    mainWindow.loadURL(startingPage);

    mainWindow.webContents.setWindowOpenHandler(() => {
        return { action: 'deny' };
    });

    // build menu
    //const mainMenu = Menu.buildFromTemplate(menuTemplate);
    //Menu.setApplicationMenu(mainMenu);
    sidebarWindow.removeMenu();

    sidebarWindow.loadFile("sidebar.html");

    {
        let pos = mainWindow.getPosition();
        let size = mainWindow.getSize();
        sidebarWindow.setPosition(pos[0] + size[0], pos[1]);
        sidebarWindow.setSize(200, size[1]);
    }


    mainWindow.on("move", () => {
        let pos = mainWindow.getPosition();
        let size = mainWindow.getSize();
        sidebarWindow.setPosition(pos[0] + size[0], pos[1]);
        sidebarWindow.setSize(200, size[1]);
    });

    mainWindow.on("resize", () => {
        let pos = mainWindow.getPosition();
        let size = mainWindow.getSize();
        sidebarWindow.setPosition(pos[0] + size[0], pos[1]);
        sidebarWindow.setSize(200, size[1]);
    });

    mainWindow.webContents.on('ready-to-show', () => {
        const toURL = mainWindow.webContents.getURL();
        const url = new URL(toURL);
        const pageName = unescape(url.pathname.replace("/wiki/","")).replaceAll("_"," ");
        console.log("loaded ", pageName);
        mainWindow.webContents.executeJavaScript("window.api.send('categories-on-page', [...document.querySelectorAll(\".catlinks a\")].map((x) => x.textContent));", false).then((result) => {
            console.log(result);
        });
    });

    mainWindow.webContents.on('did-navigate', () => {
        //mainWindow.webContents.insertCSS("h2 + ul { display: none; }");
        mainWindow.webContents.insertCSS(".navbox, .sidebar { display: none; }");

        stepsRemaining -= 1;

        if(stepsRemaining <= 0) {
            dialog.showMessageBox(
                mainWindow, {
                    message: "You ran out of steps",
                    type: "info",
                    buttons: [
                        "Retry",
                        "Next Level",
                        "Quit",
                    ],
                    defaultId: 1,
                    title: "Failed!",
                    cancelId: 2,
                }
            )
            return;
        }

        const toURL = mainWindow.webContents.getURL();

        const url = new URL(toURL);
        const pageName = unescape(url.pathname.replace("/wiki/","")).replaceAll("_"," ");

        console.log("loading ", pageName);

        if(listOfPages.length > 1 && pageName == listOfPages[0]) {
            dialog.showMessageBox(
                mainWindow, {
                    message: "Congratulations! You made it back with " + stepsRemaining + " steps remaining!",
                    type: "info",
                    buttons: [
                        "Next Vortex",
                        "Quit",
                    ],
                    defaultId: 0,
                    title: "You did it!",
                    cancelId: 1,
                }
            ).then((num,checked) => {
                if(num == 0) {
                    newLevel();
                } else {
                    app.quit();
                }
            });
            sidebarWindow.webContents.send(
                "step",
                {
                    pageName: pageName,
                    stepsRemaining: stepsRemaining,
                }
            );
            level += 1;
        } else {
            listOfPages.push(pageName);
            if(listOfPages.length == 1) {
                const nKeys = 3;
                var levelData = {
                    "level": level,
                    "target": pageName,
                    "minimumDepth": minimumDepth,
                    "keys": [
                    ]
                };
                keys.length = 0;
                while(keys.length < nKeys) {
                    var key = keyDrawPile[Math.floor(Math.random() * keyDrawPile.length)];
                    var found = false;
                    for(const k of keys) {
                        if(key == k.name) {
                            found = true;
                            break;
                        }
                    }
                    if(found) {
                        continue;
                    }
                    keys.push({ name: key, found: false });
                    levelData.keys.push(key);
                }
                sidebarWindow.webContents.send("start-round", levelData);
                stepsRemaining = 10;
            }
            sidebarWindow.webContents.send(
                "step",
                {
                    pageName: pageName,
                    stepsRemaining: stepsRemaining,
                }
            );
        }
    });

    mainWindow.webContents.on('will-navigate', (event, toURL) => {
        console.log("will navigate to ", toURL);

        const url = new URL(toURL);
        if(!url.pathname.startsWith("/wiki/")) {
            event.preventDefault();
            dialog.showErrorBox("Not Allowed", "Out of bounds!");
            return;
        }
        const pageName = unescape(url.pathname.replace("/wiki/","")).replaceAll("_"," ");

        if(listOfPages.length > 0 && listOfPages[0] == pageName) {
            // found first page again, make sure they have all the keys
            for(var i = 0; i < keys.length; i++) {
                if(keys[i].found == false) {
                    event.preventDefault();
                    dialog.showErrorBox("Not Allowed", "Cannot navigate to start page until you have found all the keys!");
                    return;
                }
            }
        }

        if(pageName == listOfPages[listOfPages.length - 1]) {
            event.preventDefault();
            dialog.showErrorBox("Not Allowed", "Cannot navigate to current page");
            return;
        }

        if(url.hostname != "en.wikipedia.org") {
            event.preventDefault();
            dialog.showErrorBox("Not Allowed", "No leaving wikipedia allowed");
            return;
        }

        if(listOfPages.includes(pageName) && pageName != listOfPages[0]) {
            event.preventDefault();
            dialog.showErrorBox("Not Allowed", "Cannot return to previously visited page");
            return;
        }

        if(pageName.startsWith("Special:")) {
            event.preventDefault();
            dialog.showErrorBox("Not Allowed", "No special pages");
            return;
        }
        if(pageName.startsWith("Talk:")) {
            event.preventDefault();
            dialog.showErrorBox("Not Allowed", "No talk pages");
            return;
        }
        if(pageName.startsWith("Portal:")) {
            event.preventDefault();
            dialog.showErrorBox("Not Allowed", "No portal pages");
            return;
        }
        if(pageName.startsWith("Category:")) {
            event.preventDefault();
            dialog.showErrorBox("Not Allowed", "No Category pages");
            return;
        }
        if(pageName.startsWith("Help:")) {
            event.preventDefault();
            dialog.showErrorBox("Not Allowed", "No Help pages");
            return;
        }
        if(pageName.startsWith("Wikipedia:")) {
            event.preventDefault();
            dialog.showErrorBox("Not Allowed", "No Wikipedia: pages");
            return;
        }
        if(pageName.startsWith("List of ")) {
            event.preventDefault();
            dialog.showErrorBox("Not Allowed", "No 'List of' Pages");
            return;
        }
        if(pageName.startsWith("Lists of ")) {
            event.preventDefault();
            dialog.showErrorBox("Not Allowed", "No 'Lists of' Pages");
            return;
        }
        if(pageName.includes("(disambiguation)")) {
            event.preventDefault();
            dialog.showErrorBox("Not Allowed", "No 'disambiguation' Pages");
            return;
        }

    });

});

// create sidebar

const menuTemplate = [
    {
        label: "File",
        submenu: [
            { label: "Quit", click() { app.quit(); } }
        ]
    }
];

const sidebar = [
];
