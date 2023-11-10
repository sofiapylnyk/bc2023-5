const express = require("express");
const fs = require("fs");
const multer = require("multer"); // Підключення Multer для обробки завантаження файлів
const upload = multer({ dest: "uploads/" });  // Налаштування шляху для завантажених файлів
const app = express();
const path = require("path"); // Підключення модуля для роботи зі шляхами файлів
const port = 8000;
// Встановлення кореневого каталогу для статичних файлів
app.use(express.static(__dirname));
app.get("/", (req, res) => {
    try {
        res.status(200).send("Go to localhost:8000/UploadForm.html");
    } catch (err) {
        res.status(500).send("Server error");
    }
});
// Повернути головну сторінку UploadForm
app.get("/UploadForm.html", (req, res) => {
    const filePath = path.join(__dirname, "static/UploadForm.html");
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            res.status(404).send("File not found.");
        } else {
            res.sendFile(filePath);
        }
    });
});
// Повернути вміст notes.js на адресу /notes
app.get("/notes", (req, res) => {
  const filePath = path.join(__dirname, "notes.json");
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // Якщо файл не існує, створити пустий файл
      fs.writeFileSync(filePath, "[]", "utf8");
      res.status(200).json([]);
    } else {
      // Якщо файл існує, зчитати його вміст та повернути його
      const notesData = fs.readFileSync(filePath, "utf8");
      const notes = JSON.parse(notesData);
      res.status(200).json(notes);
    }
  });
});
// Повернути текст нотатки за імям
app.get("/notes/:noteName", (req, res) => {
    const noteName = req.params.noteName;
    const filePath = path.join(__dirname, "notes.json");
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        // Якщо файл не існує, вивести помилку 404
        res.status(404).send("File not found.");
      } else {
        // Якщо файл існує, зчитати його вміст та знайти нотатку за ім'ям
        const notesData = fs.readFileSync(filePath, "utf8");
        const notes = JSON.parse(notesData);
        const foundNote = notes.find((note) => note.note_name === noteName);
        if (foundNote) {
          const textFromNote = foundNote.note_text.toString();
          res.status(200).send(textFromNote);
        } else {
          // Якщо нотатка з вказаним ім'ям не знайдена, вивести помилку 404
          res.status(404).send("Note not found.");
        }
      }
    });
  });
app.post("/upload", upload.single("note"), (req, res) => {
    const noteName = req.body.note_name;
    const noteText = req.body.note;
    // Перевірка наявності нотатки з вказаним ім'ям
    fs.readFile("notes.json", "utf8", (err, notesData) => {
      if (err) {
        // Якщо файл не існує, створити новий файл та зберегти нотатку
        const newNote = { note_name: noteName, note_text: noteText };
        fs.writeFileSync("notes.json", JSON.stringify([newNote]));
        res.status(201).send("Note uploaded successfully.");
      } else {
        const notes = JSON.parse(notesData);
        // Метод find() використовується для пошуку об'єкта в масиві, який задовольняє певну умову
        // notes-масив; find()-метод масиву; 
        // (note) => note.note_name === noteName - це функція зворотного виклику;
        const existingNote = notes.find((note) => note.note_name === noteName);
        if (existingNote) {
          // Якщо нотатка з таким ім'ям вже існує, повернути статус 400
          res.status(400).send("A note with this name already exists. Please use a different name.");
        } else {
          // Якщо нотатка не існує, додати нову нотатку до списку і зберегти у файл
          notes.push({ note_name: noteName, note_text: noteText });
          fs.writeFileSync("notes.json", JSON.stringify(notes));
          res.status(201).send("Note uploaded successfully.");
        }
      }
    });
  });
app.put("/notes/:noteName", (req, res) => {
    const noteName = req.params.noteName; // Отримуємо ім'я нотатки з параметрів запиту
    const filePath = path.join(__dirname, "notes.json");
    let requestBody = "";
    // Прослуховування події отримання даних від запиту
    req.on("data", chunk => {
      requestBody += chunk;
    });
  
    req.on("end", () => {
      try {
        const updatedNoteText = requestBody.toString();
        fs.access(filePath, fs.constants.F_OK, (err) => {
          if (err) {
            // Якщо файл не існує, вивести помилку 404
            res.status(404).send("File not found.");
          } else {
            // Якщо файл існує, зчитати його вміст та оновити текст нотатки за ім'ям
            const notesData = fs.readFileSync(filePath, "utf8");
            const notes = JSON.parse(notesData);
            const noteToUpdate = notes.find((note) => note.note_name === noteName);
  
            if (noteToUpdate) {
              noteToUpdate.note_text = updatedNoteText;
              fs.writeFileSync(filePath, JSON.stringify(notes));
              res.status(200).send("Note updated successfully.");
            } else {
              // Якщо нотатка з вказаним ім'ям не знайдена, вивести помилку 404
              res.status(404).send("Note not found.");
            }
          }
        });
      } catch (error) {
        res.status(400).send("Invalid request body.");
      }
    });
  }); 
app.delete("/notes/:noteName", (req, res) => {
    const noteName = req.params.noteName;
    const filePath = path.join(__dirname, "notes.json");
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        // Якщо файл не існує, вивести помилку 404
        res.status(404).send("File not found.");
      } else {
        // Якщо файл існує, зчитати його вміст та видалити нотатку за ім'ям
        const notesData = fs.readFileSync(filePath, "utf8");
        let notes = JSON.parse(notesData);
        // Збереження початкової довжини масиву нотаток
        const initialLength = notes.length;
        // Залишаємо в масиві тільки ті нотатки, ім'я яких не співпадає з noteName
        notes = notes.filter((note) => note.note_name !== noteName);
        // Перевіряємо чи була видалена хоча б одна нотатка, 
        // порівнюючи довжину масиву notes після фільтрації з його початковою довжиною.
        if (notes.length < initialLength) {
            // Оновлений масив notes перезаписується у файл notes.json
            fs.writeFileSync(filePath, JSON.stringify(notes));
            res.status(200).send("Note deleted successfully.");
        } else {
          // Якщо нотатка з вказаним ім'ям не знайдена, вивести помилку 404
          res.status(404).send("Note not found.");
        }
      }
    });
  });
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});