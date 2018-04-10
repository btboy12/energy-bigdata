const express = require("express");
const proxy = require("express-http-proxy");
const path_to_regexp = require("path-to-regexp");

const app = express();
// const port = 12345;
const port = 9012;

const handler = [
    {
        path: path_to_regexp("/api/v1/clusters/:cluster/hosts"),
        handler: data => {
            let items = data.items;
            let res_items = [];
            for (let i = 0; i < host_num; i++) {
                let source = items[Math.floor(Math.random() * items.length)];
                let source_host = Object.assign({}, source.Hosts, {
                    rack_info: rack[Math.floor(Math.random() * rack_num)]
                });
                res_items.push(Object.assign({}, source, {
                    Hosts: source_host
                }));
            }
            data.items = res_items;
            return data;
        }
    }
];

const rack = [];
const rack_num = 5;
const host_num = 100;

const proxy_url = "ambari2.biu233.com";
// const proxy_url = "192.168.31.201:10240";

for (let i = 0; i < rack_num; i++) {
    rack.push(`/rack${i}`);
}

app.use(express.static('visualize', {
    index: "test.html"
}));

app.use("/api", proxy(proxy_url, {
    proxyReqPathResolver(req) {
        return "/api" + require('url').parse(req.url).path;
    },
    userResDecorator(proxyRes, proxyResData) {
        return new Promise(function (resolve) {
            let h = handler.find(v => v.path.test(proxyRes.req.path.split('?')[0]));
            let resData;
            if (h) {
                resData = h.handler(JSON.parse(proxyResData));
            } else {
                resData = proxyResData;
            }
            resolve(resData);
        });
    }
}));

app.listen(port);
console.info(`Server running in :${port}`);