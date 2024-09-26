const sqlite3 = require("sqlite3").verbose();
const express = require("express");
const cors = require('cors');
const webpush = require('web-push');

require("dotenv").config();

const db = new sqlite3.Database("../database/task_database.db", (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("connected to database");
  }
});

const app = express();
app.use(express.json());
app.use(cors());
app.use(require('body-parser').json());

//constants
const STATUS_INCOMPLETE = 0;
const STATUS_DONE = 1;

// const publicVapidKey = process.env.PUBLIC_VAPID_KEY
// const privateVapidKey = process.env.PRIVATE_VAPID_KEY
// webpush.setVapidDetails('mailto: yuanataalex@gmail.com', publicVapidKey, privateVapidKey);

//Routes
//Authentication
app.post("/signup", (req, res) => {
  console.log("sign up request body:", req.body); // Debugging line

  const { username, password_hash } = req.body || {};

  if (!username || !password_hash) {
    return res
      .status(404)
      .json({ error: "username and password hash are required." });
  }

  const sql = "INSERT INTO user (username, password_hash) VALUES (?, ?)";
  db.run(sql, [username, password_hash], function (err) {
    if (err) {
      let msg = err.message;
      if (msg == "SQLITE_CONSTRAINT: UNIQUE constraint failed: user.username") {
        msg = "username has already been taken!";
        return res.status(400).json({ error: msg });
      }
      return res.status(500).json({ error: msg });
    }
    res.status(200).json({ message: "signup successful." });
  });
});

app.post("/login", (req, res) => {
  console.log("login request body:", req.body); // Debugging line

  const { username, password_hash } = req.body || {};

  if (!username || !password_hash) {
    return res
      .status(404)
      .json({ error: "username and password hash are required." });
  }

  const sql =
    "select count(*) as count from user where username = ? and password_hash = ?";
  db.get(sql, [username, password_hash], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: err.message });
    }

    if (row.count > 0) {
      return res
        .status(200)
        .json({ error: "username found, login successful!" });
    } else {
      return res.status(404).json({ error: "user not found." });
    }
  });
});


//Task Management
app.post("/addTasks", (req, res) => {
  console.log("addTasks body:", req.body); // Debugging line

  const { title, description, tags, creation_time, due_time, username } =
    req.body || {};

  //sanity check
  if (
    !title ||
    description == undefined ||
    tags == undefined ||
    !creation_time ||
    !due_time ||
    !username
  ) {
    return res
      .status(400)
      .json({ error: "all fields are required, check again!" });
  }

  const query = `insert into tasks (title, description, tags, creation_time, due_time, owner, status) values (?, ?, ?, ?, ?, ?, ${STATUS_INCOMPLETE})`;

  db.run(
    query,
    [title, description, tags, creation_time, due_time, username],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      console.log('new task added');
      return res
        .status(200)
        .json({ error: `new task has been added with id ${this.lastID}` });
    }
  );
});

app.post("/getTasks", (req, res) => {
  console.log("getTasks body:", req.body); // Debugging line

  const { username } = req.body || {};

  //sanity check
  if (!username) {
    return res
      .status(400)
      .json({ error: "username is mandatory, check the body!" });
  }

  const query =
    "select * from tasks where owner = ? order by due_time asc limit 10";

  db.all(query, [username], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ tasks: rows });
  });
});

app.post("/getTasks", (req, res) => {
  console.log("getTasks body:", req.body); // Debugging line

  const { username } = req.body || {};

  //sanity check
  if (!username) {
    return res
      .status(400)
      .json({ error: "username is mandatory, check the body!" });
  }

  const query =
    "select * from tasks where owner = ? order by due_time desc limit 10";

  db.all(query, [username], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ tasks: rows });
  });
});

app.get("/getTask", (req, res) => {
  console.log("getTask id:", req.query.id); // Debugging line

  const taskId = req.query.id;

  // Sanity check
  if (!taskId) {
    return res
      .status(400)
      .json({ error: "id is mandatory, check the url!" });
  }

  const query = "select * from tasks where id = ?";

  db.get(query, [taskId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Check if a row was found
    if (!row) {
      return res.status(404).json({ error: "task not found" });
    }

    res.status(200).json({ task: row });
  });
});

app.post("/updateTask", (req, res) => {
  console.log("updateTasks body:", req.body); // Debugging line

  const { title, description, tags, due_time, id } =
    req.body || {};

  //sanity check
  if (
    !title ||
    description == undefined ||
    tags == undefined ||
    !due_time ||
    !id
  ) {
    return res
      .status(400)
      .json({ error: "all fields are required, check again!" });
  }

  const query = `UPDATE tasks 
                 SET title = ?, description = ?, tags = ?, due_time = ?
                 WHERE id = ?`;

  db.run(
    query,
    [title, description, tags, due_time, id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "task not found." });
      }

      return res
        .status(200)
        .json({ message: `task id ${id} updated.` });
    }
  );
});

app.post("/deleteTask", (req, res) => {
  console.log("deleteTask body:", req.body); // Debugging line

  const { id } = req.body || {};

  // Sanity check
  if (!id) {
    return res.status(400).json({ error: "task ID is required, check the body!" });
  }

  const query = `delete from tasks where id = ?`;

  db.run(query, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: "task not found" });
    }

    return res.status(200).json({ message: "task has been deleted" });
  });
});

//Push Notification
app.post('/checkDueTasks', (req, res) => {
  console.log("checkDueTasks body:", req.body); // Debugging line

  const { username } = req.body || {};

  //sanity check
  if (!username) {
    return res
      .status(400)
      .json({ error: "username is mandatory, check the body!" });
  }

  const currentDate = new Date();
  const utcPlus7 = new Date(currentDate.getTime() + (7 * 60 * 60 * 1000)); //add 7 hours for UTC+7
  const formattedTime = utcPlus7.toISOString().slice(0, 19).replace('T', ' ');
  

  const query =
    `select count(*) from tasks where owner = ? and due_time < ?`;

  db.all(query, [username, formattedTime], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    console.log(rows);
    const count = rows.length > 0 ? rows[0]['count(*)'] : 0;

    if (count <= 0){
      res.status(404);
    }
    else {
      res.status(200).json({ count: count });
    }
  });
});

const path = require('path')
app.use('/static', express.static('../'))
app.use(express.static('../scripts'))

//start app
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`server up on port ${PORT}`);
});