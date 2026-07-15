(function () {
  var navToggle = document.getElementById('navToggle');
  var mainNav = document.getElementById('mainNav');

  // Guard: only run if both elements exist on this page.
  if (!navToggle || !mainNav) return;

  navToggle.addEventListener('click', function () {
    // .toggle() adds the class if it's missing, removes it if present.
    var isOpen = mainNav.classList.toggle('open');

    // Keep the button's aria-expanded attribute in sync for accessibility.
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
})();


(function () {
  var form        = document.getElementById('task-form');
  var titleInput  = document.getElementById('task-title');
  var dueInput    = document.getElementById('task-due');
  var priorityInput = document.getElementById('task-priority');
  var errorBox    = document.getElementById('form-error');
  var taskList    = document.getElementById('task-list');
  var emptyState  = document.getElementById('empty-state');
  var statTotal       = document.getElementById('stat-total');
  var statDone        = document.getElementById('stat-done');
  var statPending     = document.getElementById('stat-pending');
  var statCompleteRate = document.getElementById('stat-complete-rate');
  var progressFill    = document.getElementById('progress-fill');
  var cancelEdit      = null;
  var submitButton    = null;
  var editTaskId      = null;

 
  if (!form || !taskList) return;

  cancelEdit = document.getElementById('cancel-edit');
  submitButton = form.querySelector('button[type="submit"]');

  var STORAGE_KEY = 'academic-planner-tasks';

  
  var tasks = loadTasks();

  function loadTasks() {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch (err) {
     
      console.error('Could not read saved tasks, starting fresh.', err);
      return [];
    }
  }

  function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }
  function createTask(title, dueDate, priority) {
    return {
      id: Date.now(),
      title: title,
      dueDate: dueDate,       // may be an empty string if no date was chosen
      priority: priority,
      completed: false
    };
  }

  function renderTasks() {
 
    taskList.innerHTML = '';
    emptyState.style.display = tasks.length === 0 ? 'block' : 'none';

    for (var i = 0; i < tasks.length; i++) {
      var task = tasks[i];

      var li = document.createElement('li');
      li.className = 'task-item' + (task.completed ? ' completed' : '');
      li.dataset.id = task.id;

    
      var checkBtn = document.createElement('button');
      checkBtn.className = 'task-check';
      checkBtn.type = 'button';
      checkBtn.setAttribute('aria-label', task.completed ? 'Mark as not done' : 'Mark as done');
      checkBtn.textContent = task.completed ? '✓' : '';
      checkBtn.addEventListener('click', function () {
   
        var id = Number(this.closest('.task-item').dataset.id);
        toggleComplete(id);
      });


      var info = document.createElement('div');
      info.className = 'task-info';

      var titleEl = document.createElement('div');
      titleEl.className = 'task-title';
      titleEl.textContent = task.title;

      var metaEl = document.createElement('div');
      metaEl.className = 'task-meta';
      var metaParts = [];
      if (task.dueDate) metaParts.push('Due ' + task.dueDate);
      metaParts.push(task.priority + ' priority');
      metaEl.textContent = metaParts.join(' · ');

      info.appendChild(titleEl);
      info.appendChild(metaEl);

      // Delete button
      var deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'task-delete';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', function () {
        var id = Number(this.closest('.task-item').dataset.id);
        deleteTask(id);
      });

      li.appendChild(checkBtn);
      li.appendChild(info);

      var actions = document.createElement('div');
      actions.className = 'task-actions';

      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'task-edit';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', function () {
        var id = Number(this.closest('.task-item').dataset.id);
        startEdit(id);
      });

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      li.appendChild(actions);
      taskList.appendChild(li);
    }

    renderStats();
  }

 
  function renderStats() {
    var completedCount = tasks.filter(function (t) { return t.completed; }).length;
    var totalCount = tasks.length;
    var completionRate = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

    statTotal.textContent = totalCount;
    statDone.textContent = completedCount;
    statPending.textContent = totalCount - completedCount;
    statCompleteRate.textContent = completionRate + '%';
    if (progressFill) {
      progressFill.style.width = completionRate + '%';
    }
  }

  function clearFieldErrors() {
    titleInput.classList.remove('invalid');
    dueInput.classList.remove('invalid');
  }

  function setFormError(message, field) {
    errorBox.textContent = message;
    clearFieldErrors();
    if (field) {
      field.classList.add('invalid');
      field.focus();
    }
  }

  function validateTitle() {
    var title = titleInput.value.trim();
    if (title === '') {
      setFormError('Task title is required.');
      return false;
    }
    errorBox.textContent = '';
    titleInput.classList.remove('invalid');
    return true;
  }

  function validateDueDate() {
    var due = dueInput.value;
    if (!due) {
      dueInput.classList.remove('invalid');
      return true;
    }

    var selected = new Date(due);
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selected < today) {
      setFormError('Due date cannot be in the past.', dueInput);
      return false;
    }

    errorBox.textContent = '';
    dueInput.classList.remove('invalid');
    return true;
  }

  function validateForm() {
    clearFieldErrors();
    var titleValid = validateTitle();
    var dueValid = validateDueDate();
    if (!titleValid || !dueValid) {
      return false;
    }
    errorBox.textContent = '';
    return true;
  }

  function toggleComplete(id) {
    var task = tasks.find(function (t) { return t.id === id; });
    if (task) {
      task.completed = !task.completed;
      saveTasks();
      renderTasks();
    }
  }

  // ---- Remove a task entirely ----
  function deleteTask(id) {
    tasks = tasks.filter(function (t) { return t.id !== id; });
    saveTasks();
    renderTasks();
  }

  function startEdit(id) {
    var task = tasks.find(function (t) { return t.id === id; });
    if (!task) return;

    editTaskId = id;
    titleInput.value = task.title;
    dueInput.value = task.dueDate || '';
    priorityInput.value = task.priority;
    submitButton.textContent = 'Save Task';
    if (cancelEdit) {
      cancelEdit.style.display = 'inline-block';
    }
    titleInput.focus();
    errorBox.textContent = 'Editing task — make changes and save.';
  }

  function resetEditMode() {
    editTaskId = null;
    form.reset();
    submitButton.textContent = 'Add Task';
    if (cancelEdit) {
      cancelEdit.style.display = 'none';
    }
    errorBox.textContent = '';
  }

  if (cancelEdit) {
    cancelEdit.addEventListener('click', function () {
      resetEditMode();
    });
  }

  titleInput.addEventListener('input', function () {
    if (errorBox.textContent) {
      validateTitle();
    }
  });

  dueInput.addEventListener('input', function () {
    if (errorBox.textContent) {
      validateDueDate();
    }
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var title = titleInput.value.trim();
    var due = dueInput.value;
    var priority = priorityInput.value;

    if (!validateForm()) {
      return;
    }

    if (editTaskId !== null) {
      var task = tasks.find(function (t) { return t.id === editTaskId; });
      if (task) {
        task.title = title;
        task.dueDate = due;
        task.priority = priority;
        saveTasks();
        renderTasks();
        resetEditMode();
      }
    } else {
      var newTask = createTask(title, due, priority);
      tasks.push(newTask);   
      saveTasks();
      renderTasks();

      form.reset();
      priorityInput.value = 'Medium';
      titleInput.focus();
      clearFieldErrors();
    }
  });

  renderTasks();
})();



(function () {
  var form = document.getElementById('contact-form');
  if (!form) return; 
  var nameInput    = document.getElementById('name');
  var emailInput   = document.getElementById('email');
  var phoneInput   = document.getElementById('phone');
  var messageInput = document.getElementById('message');
  var statusBox    = document.getElementById('form-status');

  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var DIGITS_ONLY_PATTERN = /^[0-9]+$/;

  function setFieldError(input, errorElement, message) {
    errorElement.textContent = message;
    input.classList.toggle('invalid', Boolean(message));
  }

  function validateName() {
    var value = nameInput.value.trim();
    if (value === '') {
      setFieldError(nameInput, document.getElementById('name-error'), 'Please enter your name.');
      return false;
    }
    setFieldError(nameInput, document.getElementById('name-error'), '');
    return true;
  }

  function validateEmail() {
    var value = emailInput.value.trim();
    var errorEl = document.getElementById('email-error');
    if (value === '') {
      setFieldError(emailInput, errorEl, 'Please enter your email address.');
      return false;
    }
    if (!EMAIL_PATTERN.test(value)) {
      setFieldError(emailInput, errorEl, 'Please enter a valid email address, e.g. name@example.com.');
      return false;
    }
    setFieldError(emailInput, errorEl, '');
    return true;
  }

  function validatePhone() {
    var value = phoneInput.value.trim();
    var errorEl = document.getElementById('phone-error');
    if (value === '') {
      setFieldError(phoneInput, errorEl, 'Please enter your phone number.');
      return false;
    }
    if (!DIGITS_ONLY_PATTERN.test(value)) {
      setFieldError(phoneInput, errorEl, 'Phone number should contain digits only (no spaces or dashes).');
      return false;
    }
    setFieldError(phoneInput, errorEl, '');
    return true;
  }

  function validateMessage() {
    var value = messageInput.value.trim();
    var errorEl = document.getElementById('message-error');
    if (value === '') {
      setFieldError(messageInput, errorEl, 'Please write a short message.');
      return false;
    }
    setFieldError(messageInput, errorEl, '');
    return true;
  }

  nameInput.addEventListener('blur', validateName);
  emailInput.addEventListener('blur', validateEmail);
  phoneInput.addEventListener('blur', validatePhone);
  messageInput.addEventListener('blur', validateMessage);

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var isNameValid    = validateName();
    var isEmailValid   = validateEmail();
    var isPhoneValid   = validatePhone();
    var isMessageValid = validateMessage();

    var allValid = isNameValid && isEmailValid && isPhoneValid && isMessageValid;

    if (!allValid) {
      statusBox.textContent = 'Please fix the highlighted fields and try again.';
      statusBox.className = 'form-status show error';
      return;
    }

 
    statusBox.textContent = 'Thanks! Your message looks good and is ready to send.';
    statusBox.className = 'form-status show success';
    form.reset();
  });
})();


// Photo uploads removed: use a static image file in /images/ for consistent public display.
(function () {
  var studentPhoto = document.querySelector('.student-photo');
  var initials = document.querySelector('.initials');
  if (!studentPhoto) return;

  // Attempt to load a repository-stored profile image. If it's missing,
  // fall back to the included `student.svg`. This keeps the image fixed
  // for everyone (not stored per-browser).
  var preferred = (studentPhoto.getAttribute('src') && studentPhoto.getAttribute('src').trim()) || './images/profile.jpg';
  var fallback = './images/student.svg';

  var probe = new Image();
  probe.onload = function () {
    studentPhoto.src = preferred;
    if (initials) initials.style.opacity = '0';
  };
  probe.onerror = function () {
    studentPhoto.src = fallback;
    if (initials) initials.style.opacity = studentPhoto.src ? '0' : '1';
  };
  probe.src = preferred;
})();