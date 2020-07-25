const glob = require("glob");
const fs = require('fs');
const request = require('request');
const path = require('path');
const Promise = require('bluebird');
const axios = require('axios');

const files = glob.sync("/web/my/articles/source/_posts/**/*.md");
const rex = /<img.*?src="([^">]*\/([^">]*?))".*?>/g;

async function download (url, path) {
    if(fs.existsSync(path))
    {
        return true;
    }
    const writer = fs.createWriteStream(path)

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    })

    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
        writer.on('finish', ()=>resolve(true))
        writer.on('error', ()=>resolve(false))
    })
}

Promise.map(files, async (file)=>{
    const lastSlash = file.lastIndexOf('/');
    const postPath = file.substr(0, lastSlash+1);
    const name = file.substr(lastSlash+1);
    //console.log(path);
    // console.log(name);
    let data = fs.readFileSync(file, 'utf8');
    let changed = false;
    const matches = [...data.matchAll(rex)];

    for(let i=0;i<matches.length;i++)
    {
        const [tag, url] = matches[i];
        let filename = path.basename(url);
        const dir = `${postPath}${name.substr(0,name.length-3)}/`;
        if(!fs.existsSync(dir))
        {
            fs.mkdirSync(dir);
        }
        console.log(`Downloading ${url} to ${dir}${filename}`);
        const betterFileName = filename.replace(/-\d+x\d+\./,'.');
        const betterUrl = url.replace(filename, betterFileName); // get picture of best quality
        let res;
        let replacer = `{% asset_img ${filename} %}`;
        if(betterFileName!==filename) {
            console.log(`Trying better quality pic ${betterFileName}`)
            const encoded =  encodeURIComponent(betterFileName);
            res = await download(betterUrl.replace(betterFileName, encoded), `${dir}${betterFileName}`);
            if(!res)
            {
                console.log('better quality pic failed, falling back');
            }
            else
            {
                console.log('better quality pic success');
                replacer = `{% asset_img ${betterFileName} %}`;
            }
        }
        if(!res) {
            res = await download(url.replace(filename, encodeURIComponent(filename)), `${dir}${filename}`);
        }
        if(res) {
            console.log(`replacing ${tag} with ${replacer}`);
            data = data.replace(tag, replacer);
            changed = true;
        }
        else
        {
            console.log(`failed to download ${filename}`);
        }
    }
    if(changed){
        fs.writeFileSync(file, data, 'utf8');
    }
}, {concurrency: 4}).then(()=>console.log('completed'));
