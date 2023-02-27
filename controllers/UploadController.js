const express = require('express')
const multiparty = require('multiparty')
const fs = require('fs')
const { Buffer } = require('buffer')
const rimraf = require('rimraf')

const File = require('../models/fileModel')

exports.getFileList = [
  async ( req, res ) => {
    const uploadedFileList = await File.find()
    res.send(uploadedFileList)
  }
]

exports.deleteFile = [
    async ( req, res ) => {
      const { fileHash } = req.query
      const file  = await File.findOne((fileHash))
      if( file ) {
        await File.deleteOne({fileHash})
        await rimraf(`static/files/${file.fileName}`)
        res.send({msg: '删除成功！'})
      } else {
        res.send({msg: '服务器上不存在该文件！'})
      }
    }
]

// 上传切片
exports.upload = [
  async( req, res ) => {
    const form = new multiparty.Form();
    form.parse(req, function(err, fields, files) {
      let fileName = fields.fileName[0]
      let hash = fields.hash[0]
      let chunk = files.chunk[0]
      let dir = `static/temporary/${fileName}`
      // console.log(fileName, hash, chunk)
      try {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir)
        const buffer = fs.readFileSync(chunk.path)
        const ws = fs.createWriteStream(`${dir}/${hash}`)
        ws.write(buffer)
        ws.close()
        res.send(`${fileName}-${hash} 切片上传成功`)
      } catch (error) {
        console.error(error)
        res.status(500).send(`${fileName}-${hash} 切片上传失败`)
      }
    })
  }
]

// 切片合并
exports.merge = [
  async (req, res) => {
    const { fileName, fileHash } = req.query
    try {
      let len = 0
      const bufferList = fs.readdirSync(`static/temporary/${fileName}`).map((hash,index) => {
        const buffer = fs.readFileSync(`static/temporary/${fileName}/${index}`)
        len += buffer.length
        return buffer
      });
      //合并文件
      const buffer = Buffer.concat(bufferList, len);
      const ws = fs.createWriteStream(`static/files/${fileName}`)
      ws.write(buffer, async (err)=> {
        if(err) return res.send('文件合并失败')
        const file = await fs.promises.stat(`static/files/${fileName}`)
        const size = `${(file.size/1024/1024).toFixed(1)}M`
        await rimraf(`static/temporary/${fileName}`)
        await File.create({ fileName, fileHash, status: 3, key: Date.now(), size})
        res.send({
          prefix: `http://localhost:3000/static/files`,
          suffix: `/${fileName}`,
          fileName: `${fileName}`,
          size,
          status: 2,
        });
      })
      ws.close()
    } catch (error) {
      console.error(error, 62);
    }
  } 
]