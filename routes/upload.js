const express = require("express")
const UploadController = require("../controllers/UploadController")

const router = express.Router()

router.post('/upload-file', UploadController.upload)
router.get('/merge', UploadController.merge)
router.get('/upload-list', UploadController.getFileList)

module.exports = router