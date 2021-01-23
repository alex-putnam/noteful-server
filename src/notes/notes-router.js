const path = require('path');
const express = require('express');
const logger = require('../logger');
const xss = require('xss');
const jsonParser = express.json();

const NotesService = require('./notes-service');
const notesRouter = express.Router();

const serializeNote = (note) => ({
  id: note.id,
  note_name: xss(note.note_name),
  modified: note.modified,
  content: xss(note.content),
  folderId: note.folderId,
});

notesRouter
  .route('/')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');
    NotesService.getAllNotes(knexInstance)
      .then((note) => {
        res.json(note.map(serializeNote));
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const { note_name, modified, content, folderId } = req.body;
    const newNote = { note_name, modified, content, folderId };

    for (const [key, value] of Object.entries(newNote))
      if (value == null)
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` },
        });

    NotesService.addNote(req.app.get('db'), newNote)
      .then((note) => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${note.id}`))
          .json(serializeFolder(note));
      })
      .catch(next);
  });

notesRouter
  .route('/:note_id')
  .all((req, res, next) => {
    const { note_id } = req.params;

    FoldersService.getNoteById(req.app.get('db'), id)
      .then((note) => {
        if (!note) {
          logger.error(`Folder with id ${id} not found.`);
          return res.status(404).json({
            error: { message: `Note Not Found` },
          });
        }
        res.note = note;
        next();
      })
      .catch(next);
  })
  .get((req, res) => {
    res.json(serializeFolder(res.note));
  })
  .delete((req, res, next) => {
    const { note_id } = req.params;

    NotesService.deleteNote(req.app.get('db'), note_id)
      .then(() => {
        logger.info(`Note with id ${note_id} deleted.`);
        res.status(204).end();
      })
      .catch(next);
  })
  .patch(jsonParser, (req, res, next) => {
    const { note_name, content, folderId } = req.body;
    const noteToUpdate = { note_name, content, folderId };

    const numberOfValues = Object.values(noteToUpdate).filter(Boolean).length;
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message: `Request body must contain 'note_name', 'content', or 'folderId'`,
        },
      });
    }

    NotesService.updateNote(req.app.get('db'), req.params.note_id, noteToUpdate)
      .then(() => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = notesRouter;
