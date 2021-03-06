#!/usr/bin/env node
"use strict";

require("babel-register");

const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const express = require("express");
const webpackDevMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");
const http = require("http");
const _ = require("lodash");

// Setup Config
const getConfig = require("../config/config").getConfig;
const feature = require("../config/feature");
const config = getConfig();
feature.setConfig(config);

if (!feature.isEnabled("firefox.webSocketConnection")) {
  const firefoxProxy = require("./firefox-proxy");
  firefoxProxy({ logging: feature.isEnabled("logging.firefoxProxy") });
}

function httpGet(url, onResponse) {
  return http.get(url, (response) => {
    let body = '';
    response.on('data', function(d) {
      body += d;
    });
    response.on('end', function() {
      onResponse(body);
    });
  });
}

const app = express();

// Webpack middleware
const webpackConfig = require("../webpack.config");
const compiler = webpack(webpackConfig);

app.use(webpackDevMiddleware(compiler, {
  publicPath: webpackConfig.output.publicPath,
  noInfo: true,
  stats: { colors: true }
}));

if(feature.isEnabled("hotReloading")) {
  app.use(webpackHotMiddleware(compiler));
}

// Static middleware

app.use(express.static("public/js/test/examples"));
app.use(express.static("public"));

// Routes
app.get("/", function(req, res) {
  res.sendFile(path.join(__dirname, "../index.html"));
});

app.get("/get", function(req, res) {
  const httpReq = httpGet(
    req.query.url,
    body => res.json(JSON.parse(body))
  );

  httpReq.on('error', function (err) {
    res.status(500).send(err.code);
  });
})

// Listen
app.listen(8000, "localhost", function(err, result) {
  if (err) {
    console.log(err);
  }

  console.log("Development Server Listening at http://localhost:8000");
});
