const NODE_RELEASE = "carbon"; // Node release used in Dockerfiles

var utils = require("./utils"),
  rm_rf = require("rimraf"),
  plural = require("plural"),
  fs = require("fs"),
  Q = require("q"),
  path = require("path"),
  ejs = require("ejs"),
  exists = require("exists-file"),
  Logger = require(__dirname + "/Logger");

const OUT_FILES = {
  DEFAULT: [
    "./config/config.docker.js",
    "./Dockerfile",
    "./DockerfilePluginWorker",
    "./docker-compose.yml",
  ],
  PRODUCTION: [
    "./config/config.dockerprod.js",
    "./DockerfileNginx",
    "./docker-compose-prod.yml",
    "./nginx.conf",
  ],
};

function DockerizeManager(logger) {
  this._logger = logger || new Logger();
}

DockerizeManager.prototype.dockerize = function (args) {
  utils.changeToRootDir();

  const tempToFileInfo = [];
  let outfiles = OUT_FILES.DEFAULT;

  if (args.production) {
    outfiles = outfiles.concat(OUT_FILES.PRODUCTION);
  }

  outfiles.forEach((fPath) => {
    const existed = exists(fPath);
    if (args.forceUpdate || !existed) {
      let tPath = fPath + ".ejs";

      if (tPath.indexOf("./config/") === 0) {
        tPath = tPath.replace("./config/", "./");
      }

      tPath = tPath.replace(".", path.join(__dirname, "res"));

      tempToFileInfo.push({
        outPath: fPath,
        template: tPath,
        existed: existed,
      });
    } else if (!(args.production && OUT_FILES.DEFAULT.indexOf(fPath) > -1)) {
      this._logger.write(
        `warn: ${fPath} already existed, use --forceUpdate to overwrite`
      );
    }
  });

  // console.log(JSON.stringify(tempToFileInfo, null, 2));
  const appName = path.basename(process.cwd());
  tempToFileInfo.forEach((info) => {
    const rendered = ejs.render(fs.readFileSync(info.template, "utf-8"), {
      appName: appName,
      nodeRelease: NODE_RELEASE,
    });

    fs.writeFileSync(info.outPath, rendered);

    this._logger.write(
      `${info.existed ? "Updated" : "Created"} ${info.outPath}`
    );
  });

  const packageJSON = utils.getPackageJSON();

  if (!packageJSON.dependencies["webgme-docker-worker-manager"]) {
    packageJSON.dependencies["webgme-docker-worker-manager"] = "latest";
    this._logger.write(
      `"webgme-docker-worker-manager" added as dependency in package.json`
    );
  }

  utils.writePackageJSON(packageJSON);
  this._logger.write("\n With docker-compose installed launch with:");
  this._logger.write("$ docker-compose up -d");

  if (args.production) {
    this._logger.write(
      "To run in production mode you need to add certificates, token keys etc. " +
        "Make sure to read through docker-compose-prod.yml and modify nginx.conf as needed."
    );
  }
};

module.exports = DockerizeManager;
