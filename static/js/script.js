/*
 * Lógica de front‑end para la versión en línea del calendario de mantenimiento.
 * Proporciona autenticación básica en el lado del cliente con usuarios
 * predefinidos, control de accesos por rol (administrador, encargado y visor)
 * y persiste tareas en localStorage para que todas las personas que accedan al
 * enlace vean las mismas tareas. No requiere backend.
 */

(() => {
  // Definición de usuarios preestablecidos. Las contraseñas son simples para fines demo.
  const users = [
    { username: 'encargado1_sanmartin', password: 'sanmartin1', role: 'manager', plant: 'San Martin', name: 'Encargado 1 San Martín' },
    { username: 'encargado1_versalles', password: 'versalles1', role: 'manager', plant: 'Versalles', name: 'Encargado 1 Versalles' },
    { username: 'encargado2_versalles', password: 'versalles2', role: 'manager', plant: 'Versalles', name: 'Encargado 2 Versalles' },
    { username: 'soledad', password: 'admin1', role: 'admin', plant: '', name: 'Soledad' },
    { username: 'luis', password: 'admin2', role: 'admin', plant: '', name: 'Luis' },
    { username: 'usuario1', password: 'user1', role: 'viewer', plant: '', name: 'Usuario 1' }
  ];

  // Elementos del DOM
  const calendarEl = document.getElementById('calendar');
  const prevBtn = document.getElementById('prevMonthBtn');
  const nextBtn = document.getElementById('nextMonthBtn');
  const monthLabel = document.getElementById('currentMonth');
  const addTaskBtn = document.getElementById('addTaskBtn');
  const userControls = document.getElementById('user-controls');

  // Modal elements
  const overlay = document.getElementById('overlay');
  const loginModal = document.getElementById('loginModal');
  const loginForm = document.getElementById('loginForm');
  const loginUsername = document.getElementById('loginUsername');
  const loginPassword = document.getElementById('loginPassword');
  const loginError = document.getElementById('loginError');

  const addModal = document.getElementById('addTaskModal');
  const addForm = document.getElementById('addTaskForm');
  const taskTitleInput = document.getElementById('taskTitle');
  const taskPlantSelect = document.getElementById('taskPlant');
  const taskDateTimeInput = document.getElementById('taskDateTime');
  const taskStatusSelect = document.getElementById('taskStatus');
  const statusGroup = document.getElementById('statusGroup');
  const cancelAddBtn = document.getElementById('cancelAddBtn');

  const editModal = document.getElementById('editTaskModal');
  const editForm = document.getElementById('editTaskForm');
  const editTaskIdInput = document.getElementById('editTaskId');
  const editTaskTitle = document.getElementById('editTaskTitle');
  const editTaskPlant = document.getElementById('editTaskPlant');
  const editTaskDateTime = document.getElementById('editTaskDateTime');
  const editTaskStatus = document.getElementById('editTaskStatus');
  const deleteTaskBtn = document.getElementById('deleteTaskBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');

  // Fecha actual para la navegación del calendario
  let currentDate = new Date();

  /**
   * Obtiene el usuario actualmente autenticado desde localStorage.
   * @returns {Object|null} objeto de usuario o null
   */
  function getCurrentUser() {
    const u = localStorage.getItem('currentUser');
    try {
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Establece el usuario autenticado actual en localStorage.
   * @param {Object|null} user
   */
  function setCurrentUser(user) {
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('currentUser');
    }
  }

  /**
   * Renderiza los controles de usuario en la cabecera en función del estado de sesión.
   */
  function renderUserControls() {
    const user = getCurrentUser();
    userControls.innerHTML = '';
    if (user) {
      const infoSpan = document.createElement('span');
      infoSpan.className = 'user-info';
      infoSpan.textContent = `${user.name} (${user.role === 'admin' ? 'Administrador' : user.role === 'manager' ? 'Encargado' : 'Visor'})`;
      const logoutBtn = document.createElement('button');
      logoutBtn.textContent = 'Cerrar sesión';
      logoutBtn.addEventListener('click', () => {
        setCurrentUser(null);
        // Reload page to reset UI
        location.reload();
      });
      userControls.appendChild(infoSpan);
      userControls.appendChild(logoutBtn);
    } else {
      // Mostrar botón de inicio de sesión
      const loginBtn = document.createElement('button');
      loginBtn.textContent = 'Iniciar sesión';
      loginBtn.addEventListener('click', () => showLoginModal());
      userControls.appendChild(loginBtn);
    }
  }

  /**
   * Muestra el modal de inicio de sesión.
   */
  function showLoginModal() {
    overlay.style.display = 'block';
    loginModal.style.display = 'block';
    loginError.style.display = 'none';
    loginForm.reset();
    loginUsername.focus();
  }

  /**
   * Oculta el modal de inicio de sesión.
   */
  function hideLoginModal() {
    loginModal.style.display = 'none';
    overlay.style.display = 'none';
  }

  /**
   * Obtiene las tareas almacenadas en localStorage.
   * @returns {Array}
   */
  function getTasks() {
    const data = localStorage.getItem('tasks');
    try {
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error al obtener tareas', e);
      return [];
    }
  }

  /**
   * Guarda las tareas en localStorage.
   * @param {Array} tasks
   */
  function saveTasks(tasks) {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }

  /**
   * Genera un ID único para nuevas tareas.
   * @param {Array} tasks
   * @returns {number}
   */
  function getNextId(tasks) {
    return tasks.length ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
  }

  /**
   * Renderiza la cuadrícula del calendario con las tareas.
   */
  function renderCalendar() {
    const user = getCurrentUser();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // lunes = 0
    const daysInMonth = lastDay.getDate();
    const prevLastDay = new Date(year, month, 0);
    const daysInPrevMonth = prevLastDay.getDate();
    const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const dayNames = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
    monthLabel.textContent = `${monthNames[month]} ${year}`;
    // Clear existing grid
    calendarEl.innerHTML = '';
    // Render headers
    dayNames.forEach(name => {
      const header = document.createElement('div');
      header.className = 'day-header';
      header.textContent = name;
      calendarEl.appendChild(header);
    });
    const tasks = getTasks();
    const totalCells = 42;
    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement('div');
      cell.className = 'day-cell';
      let dayNum;
      let cellDate;
      if (i < startDayOfWeek) {
        dayNum = daysInPrevMonth - startDayOfWeek + 1 + i;
        cell.classList.add('inactive');
        cellDate = new Date(year, month - 1, dayNum);
      } else if (i >= startDayOfWeek + daysInMonth) {
        dayNum = i - (startDayOfWeek + daysInMonth) + 1;
        cell.classList.add('inactive');
        cellDate = new Date(year, month + 1, dayNum);
      } else {
        dayNum = i - startDayOfWeek + 1;
        cellDate = new Date(year, month, dayNum);
      }
      const dateStr = cellDate.toISOString().slice(0,10);
      // Day number
      const numberEl = document.createElement('div');
      numberEl.className = 'day-number';
      numberEl.textContent = dayNum;
      cell.appendChild(numberEl);
      // Tasks container
      const tasksEl = document.createElement('div');
      tasksEl.className = 'tasks';
      // Filter tasks for this date
      const dayTasks = tasks.filter(t => t.start.slice(0,10) === dateStr);
      dayTasks.forEach(task => {
        const el = document.createElement('div');
        el.classList.add('task');
        // Reemplazamos espacios por guiones para que la clase no se divida
        el.classList.add(`planta-${task.plant.replace(/\s/g, '-')}`);
        el.classList.add(`estado-${task.status.replace(/\s/g, '-')}`);
        el.textContent = task.title;
        el.dataset.id = task.id;
        if (user && user.role !== 'viewer') {
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(task.id);
          });
        }
        tasksEl.appendChild(el);
      });
      cell.appendChild(tasksEl);
      // Click to add task if user logged and not viewer and cell is in current month
      if (user && user.role !== 'viewer' && !cell.classList.contains('inactive')) {
        cell.addEventListener('click', () => {
          openAddModal(dateStr);
        });
      }
      calendarEl.appendChild(cell);
    }
    // Toggle addTaskBtn visibility
    if (user && user.role !== 'viewer') {
      addTaskBtn.style.display = 'inline-block';
    } else {
      addTaskBtn.style.display = 'none';
    }
  }

  /**
   * Muestra el modal para agregar una nueva tarea (solicitud).
   * Si se pasa una fecha se utiliza como valor inicial.
   * @param {string|undefined} dateStr
   */
  function openAddModal(dateStr) {
    const user = getCurrentUser();
    if (!user) return;
    // Reiniciar formulario
    addForm.reset();
    // Prefijar planta y habilitar/ocultar campos según rol
    if (user.role === 'manager') {
      // Encargado solo puede crear solicitudes para su planta y estado pendiente
      taskPlantSelect.value = user.plant;
      taskPlantSelect.disabled = true;
      statusGroup.style.display = 'none';
    } else {
      // Admin puede seleccionar planta y estado
      taskPlantSelect.disabled = false;
      statusGroup.style.display = 'block';
      taskStatusSelect.value = 'pendiente';
    }
    // Prefijar fecha
    if (dateStr) {
      taskDateTimeInput.value = `${dateStr}T09:00`;
    } else {
      const now = new Date();
      taskDateTimeInput.value = now.toISOString().slice(0,16);
    }
    overlay.style.display = 'block';
    addModal.style.display = 'block';
    taskTitleInput.focus();
  }

  /**
   * Cierra el modal de agregar tarea.
   */
  function closeAddModal() {
    addModal.style.display = 'none';
    overlay.style.display = 'none';
  }

  /**
   * Muestra el modal de edición para la tarea seleccionada.
   * Aplica restricciones según el rol.
   * @param {number} taskId
   */
  function openEditModal(taskId) {
    const user = getCurrentUser();
    if (!user) return;
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    // Rellenar campos
    editTaskIdInput.value = task.id;
    editTaskTitle.value = task.title;
    editTaskPlant.value = task.plant;
    editTaskDateTime.value = task.start.slice(0,16);
    editTaskStatus.value = task.status;
    // Ajustar permisos
    if (user.role === 'admin') {
      // Admin puede editar todo
      editTaskTitle.disabled = false;
      editTaskPlant.disabled = false;
      editTaskDateTime.disabled = false;
      editTaskStatus.disabled = false;
      deleteTaskBtn.style.display = 'inline-block';
    } else if (user.role === 'manager') {
      // Encargado solo puede cancelar o marcar completado su propia solicitud
      editTaskTitle.disabled = true;
      editTaskPlant.disabled = true;
      editTaskDateTime.disabled = true;
      // Permitir cambiar estado solo a cancelada o completada si fue aceptada
      // Construir opciones dinámicamente
      editTaskStatus.innerHTML = '';
      const opt1 = document.createElement('option');
      opt1.value = task.status;
      opt1.textContent = task.status.charAt(0).toUpperCase() + task.status.slice(1);
      editTaskStatus.appendChild(opt1);
      // Permitir cancelar si está pendiente o aceptada/en progreso
      if (task.status !== 'cancelada' && task.status !== 'completada') {
        const optCancel = document.createElement('option');
        optCancel.value = 'cancelada';
        optCancel.textContent = 'Cancelada';
        editTaskStatus.appendChild(optCancel);
      }
      // Permitir completada si está en progreso o aceptada
      if (task.status === 'en progreso' || task.status === 'aceptada') {
        const optComp = document.createElement('option');
        optComp.value = 'completada';
        optComp.textContent = 'Completada';
        editTaskStatus.appendChild(optComp);
      }
      editTaskStatus.disabled = false;
      deleteTaskBtn.style.display = 'none';
    }
    overlay.style.display = 'block';
    editModal.style.display = 'block';
  }

  /**
   * Cierra el modal de edición.
   */
  function closeEditModal() {
    editModal.style.display = 'none';
    overlay.style.display = 'none';
  }

  /**
   * Inicializa la aplicación al cargar la página.
   */
  function initApp() {
    renderUserControls();
    renderCalendar();
    // Navegación de meses
    prevBtn.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendar();
    });
    nextBtn.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendar();
    });
    // Botón para mostrar modal de creación
    addTaskBtn.addEventListener('click', () => openAddModal());
    // Formulario de agregar
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const tasks = getTasks();
      const user = getCurrentUser();
      const newTask = {
        id: getNextId(tasks),
        title: taskTitleInput.value.trim(),
        plant: taskPlantSelect.value,
        start: taskDateTimeInput.value,
        end: taskDateTimeInput.value,
        status: user.role === 'manager' ? 'pendiente' : taskStatusSelect.value,
        createdBy: user.username
      };
      tasks.push(newTask);
      saveTasks(tasks);
      closeAddModal();
      renderCalendar();
    });
    cancelAddBtn.addEventListener('click', closeAddModal);
    // Formulario de edición
    editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const tasks = getTasks();
      const id = parseInt(editTaskIdInput.value, 10);
      const idx = tasks.findIndex(t => t.id === id);
      if (idx >= 0) {
        const user = getCurrentUser();
        if (user.role === 'admin') {
          tasks[idx].title = editTaskTitle.value.trim();
          tasks[idx].plant = editTaskPlant.value;
          tasks[idx].start = editTaskDateTime.value;
          tasks[idx].end = editTaskDateTime.value;
          tasks[idx].status = editTaskStatus.value;
        } else if (user.role === 'manager') {
          // Encargado solo actualiza el estado
          tasks[idx].status = editTaskStatus.value;
        }
        saveTasks(tasks);
      }
      closeEditModal();
      renderCalendar();
    });
    deleteTaskBtn.addEventListener('click', () => {
      const tasks = getTasks();
      const id = parseInt(editTaskIdInput.value, 10);
      const idx = tasks.findIndex(t => t.id === id);
      if (idx >= 0) {
        if (confirm('¿Está seguro de eliminar esta tarea?')) {
          tasks.splice(idx, 1);
          saveTasks(tasks);
        }
      }
      closeEditModal();
      renderCalendar();
    });
    cancelEditBtn.addEventListener('click', closeEditModal);
  }

  // Manejo de login
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = loginUsername.value.trim();
    const p = loginPassword.value.trim();
    const found = users.find(item => item.username === u && item.password === p);
    if (found) {
      setCurrentUser({ username: found.username, role: found.role, plant: found.plant, name: found.name });
      hideLoginModal();
      initApp();
    } else {
      loginError.style.display = 'block';
    }
  });

  // Cerrar modales al hacer clic fuera de ellos
  overlay.addEventListener('click', () => {
    if (loginModal.style.display === 'block') hideLoginModal();
    if (addModal.style.display === 'block') closeAddModal();
    if (editModal.style.display === 'block') closeEditModal();
  });

  // Al cargar la página, si no hay usuario, mostrar login; de lo contrario, inicializar
  document.addEventListener('DOMContentLoaded', () => {
    const user = getCurrentUser();
    renderUserControls();
    // Siempre renderizamos el calendario de inmediato para que cualquier visitante pueda ver las
    // tareas de mantenimiento sin necesidad de autenticarse. Si el usuario no ha iniciado
    // sesión, únicamente verá la previsualización del calendario y no podrá interactuar con él.
    // Al iniciar sesión desde el botón en la cabecera se habilitarán las acciones según su rol.
    renderCalendar();
    if (user) {
      // Si hay un usuario almacenado, inicializamos por completo la aplicación (controles
      // interactivos, navegación, etc.). De lo contrario, se mostrará solo la vista de
      // calendario y el botón "Iniciar sesión" en la cabecera.
      initApp();
    }
  });
})();