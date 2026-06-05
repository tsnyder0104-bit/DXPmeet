const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbzcoT6DlXze2PlxD7hqd-9Tw-PM7cqwHwpG6zszBF8FvWiV0zIkfGnaz9DdC4ztjUg/exec";

// -------------------- STATE --------------------
let data = [];

// -------------------- DATA --------------------
async function loadData() {
  try {
    const res = await fetch(WEB_APP_URL);
    data = await res.json();
  } catch (err) {
    console.error(err);
    alert("Unable to load event data.");
  }
}

// -------------------- MAKER HELPERS --------------------
function getTodayString() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function subtractDays(dateString, days) {
  const date = new Date(dateString);
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

// -------------------- INITIAL FORM SETUP --------------------
function initMakerUI() {
  const dayPicker = document.getElementById("dayPicker");
  const deadlineDay = document.getElementById("deadlineDay");

  const today = getTodayString();
  dayPicker.min = today;
  deadlineDay.min = today;

  dayPicker.addEventListener("input", () => {
    deadlineDay.max = dayPicker.value;
    deadlineDay.value = subtractDays(dayPicker.value, 2);

    if (new Date(deadlineDay.value) < new Date()) {
      deadlineDay.value = "";
    }
  });
}

// -------------------- SUBMIT EVENT --------------------
async function submitEvent(e) {
  e.preventDefault();

  const form = e.target;
  const submitButton = document.getElementById("submitEventButton");
  submitButton.disabled = true;
  submitButton.style = `
    background-color: #e00097;
  color: white;
  border: 2px solid #a00053;
  padding: 10px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  opacity: 0.6;
  cursor: not-allowed;
    `;
  submitButton.value="Creating...";

  const formData = {
    title: form.title.value,
    date: form.date.value,
    time: form.time.value,
    duration: form.duration.value,
    deadDate: form.deadDate.value,
    deadTime: form.deadTime.value,
    count: form.count.value,
    location: form.location.value,
    notes: form.notes.value,
    status: form.status?.value || "",
    goingCount: form.goingCount?.value || 0,
    action: "newSubmission"
  };

  try {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(formData)
    });

    const result = await res.json();

    if (result.success) {
      // alert("Event created!");
      form.reset();
      await refreshApp();
    }
  } catch (err) {
    console.error(err);
    alert("Unable to create event.");
  } finally {
    submitButton.disabled = false;
    submitButton.style = `
    background-color: #e00097;
  color: white;
  border: 2px solid #a00053;
  padding: 10px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  cursor: pointer;
    `;
    submitButton.value="Create event!";
  }
}

// -------------------- VIEWER HELPERS --------------------
function timeFormatter(time) {
  return time.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function dateFormatter(date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    weekday: "long"
  });
}

function getSelectedObject() {
  const date = document.getElementById("dateSelect").value;
  return data.find((item) => item.date === date);
}

function dropdownFormatter(datePart, timePart) {
  const dt = new Date(datePart);

  dt.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);

  return dt.toLocaleString("en-US", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

// -------------------- ATTENDEES --------------------
function displayGuest(guest) {
  const guestList = document.getElementById("guestList");

  const li = document.createElement("li");

  const nameSpan = document.createElement("span");
  nameSpan.textContent = guest.name;

  const removeButton = document.createElement("button");
  removeButton.textContent = "X";
  removeButton.style = "color:red; margin:0px 10px;";
  removeButton.title = "Remove attendee";

  removeButton.addEventListener("click", () => {
    removeGuest(guest);
  });

  li.appendChild(nameSpan);
  li.appendChild(removeButton);

  guestList.appendChild(li);
}

async function removeGuest(guest) {
  const match = getSelectedObject();

  const formData = {
    name: guest.name,
    email: guest.email,
    key: match.key,
    action: "removeSignup"
  };

  try {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(formData)
    });

    const result = await res.json();

    if (result.success) {
      await refreshApp();
    }
  } catch (err) {
    console.error(err);
    alert("Unable to remove attendee.");
  }
}

// -------------------- DROPDOWN --------------------
function populateDropdown() {
  const select = document.getElementById("dateSelect");
  const currentValue = select.value;


  select.replaceChildren();

  data.forEach((row) => {
    const eventDate = new Date(row.date);
    const eventTime = new Date(row.time);
    
    const value = dropdownFormatter(eventDate, eventTime);

    const option = document.createElement("option");
    option.value = row.key;
    option.textContent = value;

    select.appendChild(option);
  });

  select.value = currentValue;
}

// -------------------- VIEW RENDER --------------------
function displayInfo(key) {
  const folks = document.getElementById("folks");
  const signupForm = document.getElementById("signupForm");

  const match = data.find((item) => item.key === key);
  if (!match) return;

  // reset UI visibility
  folks.style.display = "block";
  signupForm.style.display = "block";

  const dat = new Date(match.date);
  const tim = new Date(match.time);
  const deadDat = new Date(match.deadDate);
  const deadTim = new Date(match.deadTime);

  const guestHTML = document.getElementById("guestList");
  guestHTML.replaceChildren();

  (match.attendees || []).forEach(displayGuest);

  const details = document.getElementById("details");

  details.innerHTML = `
    <strong><p id="displayTitle" class="displayEntry"></p></strong>

    <p class="displayEntry">
      When: ${timeFormatter(tim)}, ${dateFormatter(dat)}
    </p>

    <p id="displayLocation" class="displayEntry"></p>

    <span id="tbr">
      <p class="displayEntry">
        Minimum attendance: ${match.count}
      </p>

      <p id="displayNotes" class="displayEntry"></p>

      <p class="displayEntry">
        Sign up by ${timeFormatter(deadTim)} on ${dateFormatter(deadDat)}
      </p>
    </span>
  `;

  document.getElementById("displayTitle").innerText = match.title;

  document.getElementById("displayLocation").innerText = match.location
    ? `Where: ${match.location}`
    : "Where: nobody knows fam";

  document.getElementById("displayNotes").innerText = match.notes
    ?`Notes: ${match.notes}`
    :'';

  // CANCELLED STATE
  if (match.status === "cancelled") {
    document.getElementById("tbr").style.display = "none";
    signupForm.style.display = "none";
    folks.style.display = "none";

    document.getElementById("displayLocation").textContent =
      "This event has been scheduled for destruction.";
  }
}

// -------------------- REFRESH PIPELINE --------------------
function refreshEvent() {
  const select = document.getElementById("dateSelect");

  if (!select.value && select.options.length > 0) {
    select.selectedIndex = 0;
  }

  displayInfo(select.value);
}

async function refreshApp() {
  await loadData();
  populateDropdown();
  refreshEvent();
}

// -------------------- SIGNUP --------------------
async function submitSignup(e) {
  e.preventDefault();

  const form = e.target;
  const submitButton = document.getElementById("submitButton");
  submitButton.disabled = true;
  submitButton.style = `
    background-color: #e00097;
  color: white;
  border: 2px solid #a00053;
  padding: 10px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  opacity: 0.6;
  cursor: not-allowed;
    `;
  submitButton.value="Submitting...";

  const match = getSelectedObject();

  const formData = {
    name: form.name.value,
    email: form.email.value,
    key: match.key,
    action: "eventSignup"
  };

  try {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(formData)
    });

    const result = await res.json();

    if (result.success) {
      form.reset();
      await refreshApp();
    }
  } catch (err) {
    console.error(err);
    alert("Unable to signup.");
  } finally {
    submitButton.disabled = false;
    submitButton.style = `
    background-color: #e00097;
  color: white;
  border: 2px solid #a00053;
  padding: 10px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  cursor: pointer;
    `;
    submitButton.value="Sign me up!";
  }
}

// -------------------- INIT --------------------
async function init() {
  initMakerUI();

  await loadData();

  populateDropdown();
  refreshEvent();

  document
    .getElementById("dateSelect")
    .addEventListener("change", refreshEvent);

  document
    .getElementById("signupForm")
    .addEventListener("submit", submitSignup);

  document
    .getElementById("contactForm")
    .addEventListener("submit", submitEvent);
}

init();
