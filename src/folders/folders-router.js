const path = require('path');
const express = require('express');
const logger = require('../logger');
const xss = require('xss');
const jsonParser = express.json();

const FoldersService = require('./folders-service');
const foldersRouter = express.Router();

const serializeFolder = (folder) => ({
  id: folder.id,
  folder_name: xss(folder.folder_name),
});

foldersRouter
  .route('/')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');
    FoldersService.getAllFolders(knexInstance)
      .then((folder) => {
        res.json(folder.map(serializeFolder));
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const { folder_name } = req.body;
    const newFolder = { folder_name };

    for (const [key, value] of Object.entries(newFolder))
      if (value == null)
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` },
        });

    FoldersService.addFolder(req.app.get('db'), newFolder)
      .then((folder) => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${folder.id}`))
          .json(serializeFolder(folder));
      })
      .catch(next);
  });

foldersRouter
  .route('/:folder_id')
  .all((req, res, next) => {
    const { folder_id } = req.params;

    FoldersService.getFolderById(req.app.get('db'), id)
      .then((folder) => {
        if (!folder) {
          logger.error(`Folder with id ${folder_id} not found.`);
          return res.status(404).json({
            error: { message: `Folder Not Found` },
          });
        }
        res.folder = folder;
        next();
      })
      .catch(next);
  })
  .get((req, res) => {
    res.json(serializeFolder(res.folder));
  })
  .delete((req, res, next) => {
    const { folder_id } = req.params;

    FoldersService.deleteFolder(req.app.get('db'), folder_id)
      .then(() => {
        logger.info(`Folder with id ${folder_id} deleted.`);
        res.status(204).end();
      })
      .catch(next);
  })
  .patch(jsonParser, (req, res, next) => {
    const { folder_name } = req.body;
    const folderToUpdate = { folder_name };

    const numberOfValues = Object.values(folderToUpdate).filter(Boolean).length;
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message: `Request body must contain 'folder_name'`,
        },
      });
    }

    FoldersService.updateFolder(
      req.app.get('db'),
      req.params.folder_id,
      folderToUpdate
    )
      .then(() => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = foldersRouter;
