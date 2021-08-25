const sharp = require("sharp"); //image lib
const fs = require("fs"); // file
const FileType = require("file-type");
const logger = require("./config/logger");
const cron = require("node-cron");

require("dotenv").config();
sharp.cache(false);

const _inputPath = process.env.INPUT_PATH || process.cwd() + "/files/input"; //이미지 경로
const _outputPath = process.env.OUTPUT_PATH || process.cwd() + "/files/output"; //이미지 경로
const _resizeWidth = parseInt(process.env.RESIZE_WIDTH) || 1024;
const _resizeCount = process.env.RESIZE_COUNT || 100; //이미지 경로
const _logoSize = parseInt(process.env.LOGO_SIZE) || 10;
const _logoPath = process.env.LOGO_PATH; //로고 파일
const _extRegex = new RegExp(process.env.EXT_REGEX);
const _logoGravity = process.env.LOGO_GRAVITY || "center";
const _crontab = process.env.CRONTAB;

// 디렉터리 안 파일 목록
async function getDir(path) {
  return fs.readdirSync(path, (error, list) => {
    if (error) logger.error("getDir", error);
    return list;
  });
}

// 디렉티러 비교
async function getProcList(inPath, outPath) {
  !fs.existsSync(inPath) && fs.mkdirSync(inPath, { recursive: true });
  !fs.existsSync(outPath) && fs.mkdirSync(outPath, { recursive: true });

  const input = await getDir(inPath);
  const output = await getDir(outPath);

  return input
    .filter((data) => !output.includes(data))
    .filter((data) => _extRegex.test(data))
    .slice(0,_resizeCount);
}

// 이미지 리사이징
async function imageResize(image, outputPath, name) {
  logger.info(`👉 ${name} 이미지 변환 시도 ${name}`);

  let target = image; //sharp(`${inputPath}/${name}`);
  let metadata = await target.metadata();

  return await target
    .resize(metadata.width > _resizeWidth ? _resizeWidth : metadata.width)
    .webp({ quality: 100 })
    .toFile(`${outputPath}/${name}`)
    .then(() => {
      logger.info(`👍 ${name}: 변환성공`);
      return target;
    })
    .catch((err) => {
      logger.error(`👎 ${name}: 변환실패`, err);
      return target;
    });
}

// 로고 삽입
async function addLogo(image, outputPath, name) {
  logger.info(`👉 ${name} 로고삽입 시도 ${name}`);
  let target = image;
  let metadata = await target.metadata();
  await target
    .composite([
      {
        input: await sharp(_logoPath)
          .resize(
            Math.floor(
              (metadata.width > 1024 ? 1024 : metadata.width) / _logoSize
            )
          )
          .blur(0.3)
          .toBuffer(), //logo 합성
        gravity: _logoGravity, //위치
      },
    ])
    .toFile(`${outputPath}/${name}`)
    .then(() => {
      logger.info(`👍 ${name}: 로고삽입 성공`);
      return target;
    })
    .catch((err) => {
      logger.error(`👎 ${name}: 로고삽입 실패`, err);
      return target;
    });
}

function getTimeout(startTime){
  time = new Date().getTime() - startTime;
  return "+" + time > 1000 ? Math.round(time / 1000) + "s" : time + "ms";
}

async function main() {
  let startTime = new Date().getTime();
  logger.info(`🚀 이미지 변환시작 `, _inputPath, _outputPath, _logoPath);

  if (!fs.existsSync(_logoPath)) {
    logger.warn(`🚨 로고파일 없음 ${_logoPath} 없음`);
    _logoPath = "";
  }

  const fileList = await getProcList(_inputPath, _outputPath);
  logger.info(`📑 처리할목록 총 ${fileList.length} 건`);

  await Promise.all(
    fileList.map(async (filename, index) => {
      let targetPath = _inputPath + "/" + filename;

      // 이미지 파일이 아니면 복사하고 건너뛰기
      const mimeType = await FileType.fromFile(targetPath);
      if (!mimeType?.mime.includes("image")) {
        logger.warn(`✋ [${targetPath}][mimeType: ${mimeType?.mime}] 스킵 `);
        fs.copyFileSync(targetPath, `${_outputPath}/${filename}`);
        return;
      }

      try {
        //이미지 변환 시작
        let image = sharp(`${_inputPath}/${filename}`);

        //이미지 크기변환
        image = await imageResize(image, _outputPath, filename);

        //로고 삽입
        if (_logoPath) image = await addLogo(image, _outputPath, filename);
      } catch (error) {
        logger.error(`🚨 [${targetPath}]`, error);
      }
    })
  );

  logger.info(`🎉 이미지 변환종료 ⏱소요시간: ${getTimeout(startTime)}`);
}

// (async () => {
//   cron.schedule(_crontab, main);
// })();

cron.schedule(_crontab, main);