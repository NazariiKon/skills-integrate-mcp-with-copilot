document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const closeBtn = document.querySelector(".close-btn");
  const userInfo = document.getElementById("user-info");
  const username = document.getElementById("username");
  const loginError = document.getElementById("login-error");

  let sessionId = null;
  let currentUser = null;

  // Check authentication status on page load
  async function checkAuthStatus() {
    const params = new URLSearchParams({ session_id: sessionId || "" });
    try {
      const response = await fetch(`/auth-status?${params}`);
      const data = await response.json();
      
      if (data.authenticated) {
        sessionId = sessionId;
        currentUser = data.username;
        updateAuthUI();
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
    }
  }

  // Update UI based on auth status
  function updateAuthUI() {
    if (sessionId && currentUser) {
      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
      userInfo.classList.remove("hidden");
      document.getElementById("username").textContent = currentUser;
      showDeleteButtons();
    } else {
      loginBtn.classList.remove("hidden");
      logoutBtn.classList.add("hidden");
      userInfo.classList.add("hidden");
      hideDeleteButtons();
    }
  }

  // Show delete buttons (only for authenticated teachers)
  function showDeleteButtons() {
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.classList.remove("hidden");
    });
  }

  // Hide delete buttons (for non-authenticated users)
  function hideDeleteButtons() {
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.classList.add("hidden");
    });
  }

  // Handle login modal
  loginBtn.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
    loginError.classList.add("hidden");
  });

  closeBtn.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });

  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.classList.add("hidden");
    }
  });

  // Handle login form submission
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const teacherUsername = document.getElementById("teacher-username").value;
    const teacherPassword = document.getElementById("teacher-password").value;

    try {
      const params = new URLSearchParams({
        username: teacherUsername,
        password: teacherPassword,
      });

      const response = await fetch(`/login?${params}`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        sessionId = data.session_id;
        currentUser = data.username;
        
        loginForm.reset();
        loginModal.classList.add("hidden");
        updateAuthUI();
        
        messageDiv.textContent = `Welcome, ${data.username}!`;
        messageDiv.className = "success";
        messageDiv.classList.remove("hidden");
        
        setTimeout(() => {
          messageDiv.classList.add("hidden");
        }, 3000);
      } else {
        loginError.textContent = "Invalid username or password";
        loginError.classList.remove("hidden");
      }
    } catch (error) {
      loginError.textContent = "Login failed. Please try again.";
      loginError.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  // Handle logout
  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch(`/logout?session_id=${sessionId}`, {
        method: "POST",
      });
      
      sessionId = null;
      currentUser = null;
      updateAuthUI();
      
      messageDiv.textContent = "Logged out successfully";
      messageDiv.className = "info";
      messageDiv.classList.remove("hidden");
      
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 3000);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  });

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons (hidden by default)
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn ${sessionId ? "" : "hidden"}" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });

      updateAuthUI();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!sessionId) {
      messageDiv.textContent = "You must be logged in as a teacher to unregister students";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    try {
      const params = new URLSearchParams({
        email: email,
        session_id: sessionId,
      });

      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?${params}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    if (!sessionId) {
      messageDiv.textContent = "You must be logged in as a teacher to register students";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    try {
      const params = new URLSearchParams({
        email: email,
        session_id: sessionId,
      });

      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?${params}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  checkAuthStatus();
