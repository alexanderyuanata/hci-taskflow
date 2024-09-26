async function handleSignUp(event) {
  event.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (!username || !password) {
    showMessageModal("Please fill in both username and password.");
    return;
  }

  if (username.includes(' ')){
    showMessageModal("All usernames cannot include spaces, please remove all spaces and try again.");
    return;
  }

  if (password.length < 3){
    showMessageModal("Passwords should be at least 3 characters long, please try again.");
    return;
  }

  await signUp(username, password);
}

async function handleLogin() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (username && password) {
    await login(username, password);
  } else {
    showMessageModal("Please fill in both username and password.");
  }
}

async function signUp(username, password) {
  const hashedPassword = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(password)
  );

  const hashArray = Array.from(new Uint8Array(hashedPassword));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    username: username,
    password_hash: hashHex,
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
  };

  try {
    const response = await fetch(
      "http://localhost:3001/signup",
      requestOptions
    );
    console.log(await response.text());

    //successful sign up
    if (response.status === 200) {
      sessionStorage.setItem(
        "currentUser",
        JSON.stringify({ username: username })
      );
      window.location.href = "./home.html";
    } else if (response.status === 400) {
      showMessageModal(
        "That username has already been taken, please try a new username."
      );
    } else {
      showMessageModal("An error has occured, please try again!");
    }
  } catch (error) {
    console.error(error);
    showMessageModal("An error has occured, please try again!");
  }
}

async function login(username, password) {
  const hashedPassword = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(password)
  );

  const hashArray = Array.from(new Uint8Array(hashedPassword));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    username: username,
    password_hash: hashHex,
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  try {
    const response = await fetch("http://localhost:3001/login", requestOptions);
    console.log(await response.text());

    //successful sign in
    if (response.status === 200) {
      continueToMenu(username);
    } else if (response.status === 404) {
      showMessageModal(
        "User not found, either the user doesn't exist or the credentials are wrong. Please try again."
      );
    } else {
      showMessageModal("An error has occured, please try again!");
    }
  } catch (error) {
    console.error(error);
  }
}

function continueToMenu(username) {
  console.log("added new user");
  sessionStorage.setItem("currentUser", JSON.stringify({ username: username }));

  showMessageModalCallback(
    "Authentication successful, welcome to TaskFlow!",
    function () {
      window.location.href = "./home.html";
    }
  );
}

function logout() {
  sessionStorage.clear();

  showMessageModalCallback(
    "You have successfully signed out of TaskFlow.",
    function () {
      window.location.href = "./index.html";
    }
  );
}

async function getTasks() {
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
  console.log(currentUser);

  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    username: currentUser.username,
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  await fetch("http://localhost:3001/getTasks", requestOptions)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok " + response.statusText);
      }
      return response.json(); // Parse the JSON from the response
    })
    .then((data) => {
      const cardRow = document.getElementById("cardRow");
      const tasksToDisplay = data.tasks;
      if (tasksToDisplay.length == 0) {
        console.log("no task found belonging to this user");
        const notification = document.createElement("p");
        notification.id = "no-task-notif";
        notification.textContent =
          "You don't have any tasks. Press the 'Add Task' button on the bottom right corner to create one.";

        cardRow.appendChild(notification);
      } else {
        let lastDay = undefined;
        let today = undefined;
        const currentDay = new Date().toISOString().split('T')[0];
        console.log('current day is ' + currentDay);

        tasksToDisplay.forEach((task) => {
          today = task.due_time.substring(0,10);
          
          //if the current date is different
          if (lastDay != today){
            //create a new grouping
            const dateGroup = document.createElement("div");
            dateGroup.className = "";

            dateGroup.innerHTML = `
              <p class="text-muted mb-2 mt-4 ps-2"><u>${today == currentDay ? "<b>TODAY</b>" : today}</u></p>
            `;

            cardRow.appendChild(dateGroup);

            lastDay = today;
          }
          //else do nothing

          const card = document.createElement("div");
          const taskIsDue = task.due_time < getCurrentLocalTime();
          card.className = "mx-auto my-2 ";

          card.innerHTML = `
          <div class="card mb-2 taskCard ${taskIsDue ? 'due-task' : ''}" onclick="location.href='./task.html?id=${task.id}'">
              <div class="card-body">
                  <h5 class="card-title">${task.title}</h5>
                  <p class="card-text">${task.description}</p>
                  <p class="card-text my-0"><small id="due-time">${taskIsDue ? '<strong>TASK IS DUE: </strong>' : 'DUE TIME'} ${task.due_time}</small></p>
                  <button type="button" class="btn btn-link btn-sm position-absolute top-0 end-0 py-2 px-3" onclick="event.stopPropagation(); showDeleteConfirmationWithID(${task.id})">
                      <i class="fas fa-trash" style="color: rgb(255, 21, 95)"></i>
                  </button>
              </div>
          </div>
        `;

          cardRow.appendChild(card); // Append the card to the row
        });
      }
    })
    .catch((error) => {
      console.error("There was a problem with the fetch operation:", error);
      showMessageModal("An error has occured while fetching tasks!");
    });
}

async function getTask() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");

  console.log("trying to fetch task with id " + id);

  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };

  await fetch(`http://localhost:3001/getTask?id=${id}`, requestOptions)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok " + response.statusText);
      }
      return response.json(); // Parse the JSON from the response
    })
    .then((data) => {
      taskDetail = data.task;
      console.log(taskDetail);

      const taskTitle = document.getElementById("task-title");
      const taskDesc = document.getElementById("task-desc");
      const taskTags = document.getElementById("task-tags");
      const taskDueDate = document.getElementById("task-due");

      taskTitle.textContent = taskDetail.title;
      taskDesc.textContent = taskDetail.description;
      taskTags.textContent = taskDetail.tags;
      taskDueDate.textContent = taskDetail.due_time;
    })
    .catch((error) => {
      console.error("There was a problem with the fetch operation:", error);
      showMessageModal("An error has occured while fetching tasks!");
    });
}

async function addTask() {
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));

  //get input data
  const taskTitle = document.getElementById("input-title").value;
  let taskDescription = document.getElementById("input-desc").value;
  let taskTags = document.getElementById("input-tags").value;
  const taskDue = document.getElementById("input-due").value;

  if (!taskTitle || !taskDue) {
    showMessageModal(
      "Title and Due Time is mandatory! Please fill them in before adding task!"
    );
    return;
  }

  const formattedTaskDue =
    taskDue.slice(0, 10) + " " + taskDue.slice(11, 16) + ":00";

  if (!taskDescription) {
    taskDescription = "";
  }

  if (!taskTags) {
    taskTags = "";
  }

  const now = new Date();
  const utcOffset = now.getTimezoneOffset() * 60000;
  const utcTime = new Date(now.getTime() + utcOffset);
  const formattedTime = utcTime.toISOString().slice(0, 19).replace("T", " ");

  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    title: taskTitle,
    description: taskDescription,
    tags: taskTags,
    creation_time: formattedTime,
    due_time: formattedTaskDue,
    username: currentUser.username,
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  console.log(raw);

  await fetch("http://localhost:3001/addTasks", requestOptions)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok " + response.statusText);
      }
      return response.json();
    })
    .then((task) => {
      console.log("successfully added task");
      window.location.href = "./home.html";
    })
    .catch((error) => {
      console.error("There was a problem with the fetch operation:", error);
      showMessageModal("An error has occured while adding tasks!");
    });
}

async function updateTask() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");

  //get input data
  const taskTitle = document.getElementById("update-title").value;
  let taskDescription = document.getElementById("update-desc").value;
  let taskTags = document.getElementById("update-tags").value;
  const taskDue = document.getElementById("update-due").value;

  if (!taskTitle || !taskDue) {
    showMessageModal(
      "Title and Due Time is mandatory! Please fill them in before finishing update!"
    );
    return;
  }

  const formattedTaskDue =
    taskDue.slice(0, 10) + " " + taskDue.slice(11, 16) + ":00";

  if (taskDescription == undefined) {
    taskDescription = "";
  }

  if (taskTags == undefined) {
    taskTags = "";
  }

  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    title: taskTitle,
    description: taskDescription,
    tags: taskTags,
    due_time: formattedTaskDue,
    id: id,
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  console.log(raw);

  await fetch("http://localhost:3001/updateTask", requestOptions)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok " + response.statusText);
      }
      return response.json();
    })
    .then((task) => {
      console.log("successfully updated task");
      window.location.href = "./home.html";
    })
    .catch((error) => {
      console.error("There was a problem with the update operation:", error);
      showMessageModal("An error has occured while updating tasks!");
    });
}

async function getTaskToUpdate() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");

  console.log("trying to fetch task with id " + id);

  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };

  await fetch(`http://localhost:3001/getTask?id=${id}`, requestOptions)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok " + response.statusText);
      }
      return response.json(); // Parse the JSON from the response
    })
    .then((data) => {
      taskDetail = data.task;
      console.log(taskDetail);

      const taskTitle = document.getElementById("update-title");
      const taskDesc = document.getElementById("update-desc");
      const taskTags = document.getElementById("update-tags");
      const taskDueDate = document.getElementById("update-due");

      taskTitle.value = taskDetail.title;
      taskDesc.value = taskDetail.description;
      taskTags.value = taskDetail.tags;
      taskDueDate.value = taskDetail.due_time;
    })
    .catch((error) => {
      console.error("There was a problem with the fetch operation:", error);
      showMessageModal("An error has occured while fetching tasks!");
    });
}

async function deleteTask() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");

  console.log("trying to delete task with id " + id);

  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    id: id,
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  await fetch(`http://localhost:3001/deleteTask`, requestOptions)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok " + response.statusText);
      }
      return response.json(); // Parse the JSON from the response
    })
    .then((data) => {
      window.location.href = "./home.html";
    })
    .catch((error) => {
      console.error("There was a problem with the fetch operation:", error);
      showMessageModal("An error has occured while deleting task!");
    });
}

async function deleteTaskWithID(task_id) {
  const id = task_id;

  console.log("trying to delete task with id " + id);

  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    id: id,
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  await fetch(`http://localhost:3001/deleteTask`, requestOptions)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok " + response.statusText);
      }
      return response.json(); // Parse the JSON from the response
    })
    .then((data) => {
      window.location.href = "./home.html";
    })
    .catch((error) => {
      console.error("There was a problem with the fetch operation:", error);
      showMessageModal("An error has occured while deleting task!");
    });
}

function showMessageModal(message) {
  document.getElementById("modalMessage").textContent = message;

  const modal = new bootstrap.Modal(document.getElementById("messageModal"));
  modal.show();
}

function showMessageModalCallback(message, onCloseCallback) {
  document.getElementById("modalMessage").textContent = message;

  const modalElement = document.getElementById("messageModal");
  const modal = new bootstrap.Modal(modalElement);

  modalElement.addEventListener(
    "hidden.bs.modal",
    function () {
      if (onCloseCallback) {
        onCloseCallback();
      }
    },
    { once: true }
  );

  modal.show();
}

function showDeleteConfirmation() {
  const modal = new bootstrap.Modal(document.getElementById("confirmDelete"));
  modal.show();
}

function showDeleteConfirmationWithID(id) {
  const modalElement = document.getElementById("confirmDelete");
  const modal = new bootstrap.Modal(modalElement);

  console.log('showing modal to delete task with id ' + id);
  document.querySelector('#home-task-delete-btn').addEventListener('click', function() {
    deleteTaskWithID(id);
  }, { once: true });

  modal.show();
}

// Checks for whenever the application loads
function onDocumentLoad() {
  console.log("Document has loaded!");

  const filename = window.location.pathname.split("/").pop();
  if (filename == "home.html") {
    console.log("fetching tasks...");
    getTasks();
  } else if (filename == "task.html") {
    getTask();
    const editBtn = document.getElementById("update-btn");

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");

    editBtn.href = `./updateTask.html?id=${id}`;
  } else if (filename == "updateTask.html") {
    getTaskToUpdate();
  }
}

document.addEventListener("DOMContentLoaded", onDocumentLoad);

//Notifications
// Request for notification permissions
Notification.requestPermission().then((permission) => {
  if (permission === "granted") {
    console.log("Notification permission granted.");
  }
});

function showNotification(title, content) {
  console.log("showing new notification");
  new Notification(title, {
    body: content,
  });
}

function checkDueTasks() {
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
  if (!currentUser || currentUser == undefined) {
    return;
  }

  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    username: currentUser.username,
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  console.log("checking for tasks...");
  fetch("http://localhost:3001/checkDueTasks", requestOptions)
    .then((response) => {
      if (response.status === 200) {
        return response.json();
      } else {
        throw new Error("No task due when checked!");
      }
    })
    .then((data) => {
      const count = data.count;
      //show notification
      showNotification(
        "Task(s) Due!",
        `You have ${count} tasks due as of now!`
      );
    })
    .catch((error) => {
      console.error(error);
    });
}

//Notification checker
setInterval(checkDueTasks, 60000); // send every minute

function getCurrentLocalTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// const publicVapidKey = 'BJ4hO-JT-vCAjwDWVB0uZK65nSFJ6RAEwpkKvg8DsJ8S0ZybijDCQyWgRVOP2VJIY6s973gsG5SrpqQv-ATidHo';

// if ('serviceWorker' in navigator) {
//   run().catch(error => console.error(error));
// }

// async function run() {
//   console.log('registering service worker');
//   const registration = await navigator.serviceWorker.
//     register('/worker.js', {scope: '/'});
//   console.log('registered service worker');

//   console.log('registering push notification');
//   const subscription = await registration.pushManager.
//     subscribe({
//       userVisibleOnly: true,
//       applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
//     });
//   console.log('registered push notification');

//   console.log('sending push');
//   await fetch('/subscribe', {
//     method: 'POST',
//     body: JSON.stringify(subscription),
//     headers: {
//       'content-type': 'application/json'
//     }
//   });
//   console.log('sent push');
// }

// function urlBase64ToUint8Array(base64String) {
//   const padding = '='.repeat((4 - base64String.length % 4) % 4);
//   const base64 = (base64String + padding)
//     .replace(/-/g, '+')
//     .replace(/_/g, '/');

//   const rawData = window.atob(base64);
//   const outputArray = new Uint8Array(rawData.length);

//   for (let i = 0; i < rawData.length; ++i) {
//     outputArray[i] = rawData.charCodeAt(i);
//   }
//   return outputArray;
// }
