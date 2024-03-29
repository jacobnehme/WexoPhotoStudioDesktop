// Modules to control application life and create native browser window
const {app, BrowserWindow, dialog, Menu} = require('electron')
const path = require('path')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    // and load the index.html of the app.
    // mainWindow.loadFile('index.html')
    mainWindow.loadURL('http://127.0.0.1:8000/');

    //Custom Menu
    const template = [
        // { role: 'appMenu' }
        ...(process.platform === 'darwin' ? [{
            label: app.getName(),
            submenu: [
                {role: 'about'},
                {type: 'separator'},
                {role: 'services'},
                {type: 'separator'},
                {role: 'hide'},
                {role: 'hideothers'},
                {role: 'unhide'},
                {type: 'separator'},
                {role: 'quit'}
            ]
        }] : []),
        // { role: 'fileMenu' }
        {
            label: 'File',
            submenu: [
                {
                    label: 'Scan Barcode',
                    accelerator: 'Control+B',
                    click() {
                        scanBarcode();
                    }
                },
                {type: 'separator'},
                {
                    label: 'Select Folder',
                    click() {
                        selectFolder();
                    }
                },
                // {
                //     label: '(Dev) Watch Folder',
                //     click() {
                //         watchFolder();
                //     }
                // },
                false ? {role: 'close'} : {role: 'quit'}
            ]
        },
        // { role: 'editMenu' }
        {
            label: 'Edit',
            submenu: [
                {role: 'undo'},
                {role: 'redo'},
                {type: 'separator'},
                {role: 'cut'},
                {role: 'copy'},
                {role: 'paste'},
                ...(false ? [
                    {role: 'pasteAndMatchStyle'},
                    {role: 'delete'},
                    {role: 'selectAll'},
                    {type: 'separator'},
                    {
                        label: 'Speech',
                        submenu: [
                            {role: 'startspeaking'},
                            {role: 'stopspeaking'}
                        ]
                    }
                ] : [
                    {role: 'delete'},
                    {type: 'separator'},
                    {role: 'selectAll'}
                ])
            ]
        },
        // { role: 'viewMenu' }
        {
            label: 'View',
            submenu: [
                {role: 'reload'},
                {role: 'forcereload'},
                {role: 'toggledevtools'},
                {type: 'separator'},
                {role: 'resetzoom'},
                {role: 'zoomin'},
                {role: 'zoomout'},
                {type: 'separator'},
                {role: 'togglefullscreen'}
            ]
        },
        // { role: 'windowMenu' }
        {
            label: 'Window',
            submenu: [
                {role: 'minimize'},
                {role: 'zoom'},
                ...(false ? [
                    {type: 'separator'},
                    {role: 'front'},
                    {type: 'separator'},
                    {role: 'window'}
                ] : [
                    {role: 'close'}
                ])
            ]
        },
        {
            role: 'help',
            submenu: [
                {
                    label: 'Learn More',
                    click: async () => {
                        const {shell} = require('electron')
                        await shell.openExternal('https://electronjs.org')
                    }
                }
            ]
        }
    ]
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) createWindow()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

//Requirements
const chokidar = require('chokidar');
const fs = require('fs');
const formData = require('form-data');
const axios = require('axios');
const prompt = require('electron-prompt');

//Select Folder
function selectFolder() {
    dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
    }).then(result => {
        watchFolder(result.filePaths);
    }).catch(err => {
        console.log(err)
    });
}

let files = [];
function watchFolder(folder) {
    files = [];
    chokidar.watch(folder).on('add', path => {
        files.push(path);
    });
}

//Scan Barcode
function scanBarcode() {
    prompt({
        title: 'Scan Barcode',
        label: 'Scan Barcode',
        type: 'input',
    }, mainWindow).then(result => {
        upload(result);
    }).catch(err => {
        console.log(err)
    });
}

function upload(barcode) {

    if (files.length > 0){
        let form = new formData;
        form.append('orderLine_id', barcode);

        for (let i = 0, len = files.length; i < len; i++) {
            form.append('photos[]', loadFile(files[i]));
        }

        postForm(form);
        files = [];
    }
    else{
        console.log('No files');
    }
}

function loadFile(path) {
    return fs.createReadStream(path);
}

function postForm(form) {
    axios.post('http://127.0.0.1:8000/photos', form, {
        headers: {
            'Content-Type': 'multipart/form-data; boundary=' + form.getBoundary()
        }
    }).then(function (response) {
        console.log(response.data);
    }).catch((error) => {
        console.error(error)
    })
}

app.on('ready', selectFolder);