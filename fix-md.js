const glob = require("glob");
const fs = require('fs');
const Promise = require('bluebird');
const TurndownService = require('turndown')

const turndownService = new TurndownService();


const rex = [/<a.*?href="([^">]*\/([^">]*?))".*?<\/a>/g];
rex.push(/<i>.*?<\/i>/g);
rex.push(/<b>.*?<\/b>/g);
rex.push(/<strong>.*?<\/strong>/g);
rex.push(/<em>.*?<\/em>/g);
rex.push(/<i>.*?<\/i>/g);
rex.push(/<i>.*?<\/i>/g);
rex.push(/<i>.*?<\/i>/g);

const asset = /{% asset_img .*? %}/g;

const files = glob.sync("/web/my/articles/source/_posts/**/*.md");
Promise.map(files, async (file)=>{
    const lastSlash = file.lastIndexOf('/');
    const postPath = file.substr(0, lastSlash+1);
    const name = file.substr(lastSlash+1);
    //console.log(path);
    // console.log(name);
    let m;
    let data = fs.readFileSync(file, 'utf8');
    rex.forEach((re)=>{
        const matches = [...data.matchAll(re)];
        for(let i=0;i<matches.length;i++)
        {
            const [tag, url] = matches[i];
            const inner = [...tag.matchAll(asset)]
            if(inner.length)
            {
                data = data.replace(tag, inner.map(r=>r[0]).join('\n\n'));
            }
            else
            {
                const markdown = turndownService.turndown(tag);
                data = data.replace(tag, markdown);
            }
        }
    })
    fs.writeFileSync(file, data, 'utf8');
}, {concurrency: 1}).then(()=>console.log('completed'));
