/*
 * Script principal para la aplicación de mantenimiento Baires Catering.
 * Gestiona la autenticación simple, la navegación entre secciones y el
 * almacenamiento local de tareas, máquinas, repuestos, herramientas,
 * solicitudes, presupuestos, proveedores y plantillas. No utiliza
 * dependencias externas y funciona completamente en el navegador.
 */

(() => {
  /**
   * Usuarios predefinidos. Las contraseñas son simples para fines demostrativos.
   * - Encargados: pueden crear solicitudes y ver datos; no pueden modificar otros registros.
   * - Administradores: pueden crear, editar y eliminar cualquier elemento.
   * - Visores: sólo pueden visualizar.
   */
  // Usuarios por defecto. Los usuarios personalizados se almacenan por separado en localStorage.
  const defaultUsers = [
    { username: 'encargado1_sanmartin', password: 'sanmartin1', role: 'manager', plant: 'San Martin', name: 'Encargado 1 San Martín' },
    { username: 'encargado1_versalles', password: 'versalles1', role: 'manager', plant: 'Versalles', name: 'Encargado 1 Versalles' },
    { username: 'encargado2_versalles', password: 'versalles2', role: 'manager', plant: 'Versalles', name: 'Encargado 2 Versalles' },
    { username: 'soledad', password: 'admin1', role: 'admin', plant: '', name: 'Soledad' },
    { username: 'luis', password: 'admin2', role: 'admin', plant: '', name: 'Luis' },
    { username: 'usuario1', password: 'user1', role: 'viewer', plant: '', name: 'Usuario 1' }
  ];

  /**
   * Obtiene los usuarios personalizados almacenados en localStorage.
   * Estos usuarios se suman a los usuarios por defecto para autenticar y administrar.
   */
  function getCustomUsers() {
    return getStorage('customUsers', []);
  }

  /**
   * Guarda la lista de usuarios personalizados en localStorage.
   * @param {Array} arr
   */
  function saveCustomUsers(arr) {
    setStorage('customUsers', arr);
  }

  /**
   * Elimina un usuario. Si el usuario pertenece a la lista de personalizados,
   * se elimina de customUsers. Si es un usuario por defecto, se marca como
   * eliminado en la lista de deletedUsers para ocultarlo. No elimina al
   * usuario actualmente logueado.
   * @param {Object} user
   */
  function deleteUser(user) {
    // Evitar eliminar al usuario logueado por accidente
    const current = getCurrentUser();
    if (current && current.username === user.username) return;
    const custom = getCustomUsers();
    const idx = custom.findIndex(u => u.username === user.username);
    if (idx >= 0) {
      custom.splice(idx, 1);
      saveCustomUsers(custom);
    } else {
      // Es un usuario por defecto: marcar como eliminado
      let del = getDeletedUsers();
      if (!del.includes(user.username)) {
        del.push(user.username);
        saveDeletedUsers(del);
      }
    }
  }

  /**
   * Devuelve la lista combinada de usuarios por defecto y personalizados.
   */
  function getAllUsers() {
    // Excluir los usuarios que hayan sido marcados como eliminados en localStorage
    const deleted = getDeletedUsers();
    return [...defaultUsers, ...getCustomUsers()].filter(u => !deleted.includes(u.username));
  }

  /**
   * Obtiene la lista de usuarios eliminados (por defecto). Los usuarios eliminados
   * se excluyen de getAllUsers. Almacena un array de nombres de usuario.
   */
  function getDeletedUsers() {
    return getStorage('deletedUsers', []);
  }

  /**
   * Guarda la lista de usuarios eliminados en localStorage.
   * @param {Array} arr
   */
  function saveDeletedUsers(arr) {
    setStorage('deletedUsers', arr);
  }

  // Elementos comunes del DOM
  const userControlsEl = document.getElementById('user-controls');
  const navItems = document.querySelectorAll('.main-nav li');
  const sections = document.querySelectorAll('main .section');
  const overlay = document.getElementById('overlay');
  const modalContainer = document.getElementById('modalContainer');

  // IDs de secciones
  const SECTION_IDS = {
    calendar: 'calendarSection',
    requests: 'requestsSection',
    budgets: 'budgetsSection',
    machines: 'machinesSection',
    spareParts: 'sparePartsSection',
    tools: 'toolsSection',
    providers: 'providersSection',
    templates: 'templatesSection'
    ,settings: 'settingsSection'
  };

  /**
   * Niveles de urgencia que pueden asignarse a tareas y solicitudes. Cada nivel
   * tiene un valor y una etiqueta para mostrar en los formularios y listados.
   */
  const URGENCY_LEVELS = [
    { value: 'baja', label: 'Baja' },
    { value: 'media', label: 'Media' },
    { value: 'alta', label: 'Alta' }
  ];

  // Estado del calendario
  let currentDate = new Date();

  /**
   * Recupera un valor JSON desde localStorage o devuelve un valor por defecto.
   * @param {string} key
   * @param {any} defaultValue
   */
  function getStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
    }
  }

  /**
   * Guarda un objeto o array en localStorage.
   * @param {string} key
   * @param {any} value
   */
  function setStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  /**
   * Obtiene el usuario actual desde localStorage.
   */
  function getCurrentUser() {
    return getStorage('currentUser', null);
  }

  /**
   * Establece el usuario actual en localStorage o lo elimina.
   * @param {Object|null} user
   */
  function setCurrentUser(user) {
    if (user) {
      setStorage('currentUser', user);
    } else {
      localStorage.removeItem('currentUser');
    }
  }

  /**
   * Genera un nuevo ID incremental para un array de objetos guardados.
   * @param {Array} arr
   */
  function getNextId(arr) {
    return arr.length ? Math.max(...arr.map(i => i.id)) + 1 : 1;
  }

  // Funciones para renderizar secciones

  /**
   * Actualiza la barra de usuario dependiendo del estado de sesión.
   */
  function renderUserControls() {
    const user = getCurrentUser();
    userControlsEl.innerHTML = '';
    if (user) {
      const span = document.createElement('span');
      span.textContent = `${user.name} (${user.role === 'admin' ? 'Administrador' : user.role === 'manager' ? 'Encargado' : 'Visor'})`;
      const btn = document.createElement('button');
      btn.textContent = 'Cerrar sesión';
      btn.addEventListener('click', () => {
        setCurrentUser(null);
        location.reload();
      });
      userControlsEl.appendChild(span);
      userControlsEl.appendChild(btn);
      // Mostrar u ocultar las opciones del menú según el rol
      document.querySelectorAll('.main-nav li.admin-only').forEach(li => {
        li.style.display = (user.role === 'admin') ? 'block' : 'none';
      });
      // Mostrar botón de configuración solo a administradores
      const addUserBtn = document.getElementById('addUserBtn');
      if (addUserBtn) {
        addUserBtn.style.display = user.role === 'admin' ? 'inline-block' : 'none';
      }
    } else {
      const loginBtn = document.createElement('button');
      loginBtn.textContent = 'Iniciar sesión';
      loginBtn.addEventListener('click', showLoginModal);
      userControlsEl.appendChild(loginBtn);
      // Si no hay usuario, ocultar elementos del menú de administración
      document.querySelectorAll('.main-nav li.admin-only').forEach(li => {
        li.style.display = 'none';
      });
    }
  }

  /**
   * Cambia la sección visible según el elemento de navegación seleccionado.
   * @param {string} sectionId
   */
  function showSection(sectionId) {
    sections.forEach(sec => {
      if (sec.id === sectionId) {
        sec.classList.add('visible');
      } else {
        sec.classList.remove('visible');
      }
    });
    navItems.forEach(li => {
      if (li.dataset.section === sectionId) {
        li.classList.add('active');
      } else {
        li.classList.remove('active');
      }
    });
    // Renderizar según sección
    switch (sectionId) {
      case SECTION_IDS.calendar:
        renderCalendar();
        break;
      case SECTION_IDS.requests:
        renderRequests();
        break;
      case SECTION_IDS.budgets:
        renderBudgets();
        break;
      case SECTION_IDS.machines:
        renderMachines();
        break;
      case SECTION_IDS.spareParts:
        renderSpareParts();
        break;
      case SECTION_IDS.tools:
        renderTools();
        break;
      case SECTION_IDS.providers:
        renderProviders();
        break;
      case SECTION_IDS.templates:
        renderTemplates();
        break;
      case SECTION_IDS.settings:
        renderUsers();
        break;
    }
  }

  /**
   * Navegación de la barra principal.
   */
  function initNavigation() {
    navItems.forEach(li => {
      li.addEventListener('click', () => {
        const id = li.dataset.section;
        showSection(id);
      });
    });
  }

  // ==================== Calendario ====================
  const calendarEl = document.getElementById('calendar');
  const prevMonthBtn = document.getElementById('prevMonthBtn');
  const nextMonthBtn = document.getElementById('nextMonthBtn');
  const monthLabel = document.getElementById('currentMonth');
  const addTaskBtn = document.getElementById('addTaskBtn');

  /**
   * Devuelve las tareas almacenadas.
   */
  function getTasks() {
    return getStorage('tasks', []);
  }

  /**
   * Guarda las tareas en localStorage.
   * @param {Array} tasks
   */
  function saveTasks(tasks) {
    setStorage('tasks', tasks);
  }

  /**
   * Renderiza la cuadrícula del calendario.
   */
  function renderCalendar() {
    const user = getCurrentUser();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // lunes = 0
    const daysInMonth = lastDay.getDate();
    const prevLastDay = new Date(year, month, 0).getDate();
    const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const dayNames = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
    monthLabel.textContent = `${monthNames[month]} ${year}`;
    calendarEl.innerHTML = '';
    // Headers
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
        dayNum = prevLastDay - startDayOfWeek + 1 + i;
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
      // Number
      const numEl = document.createElement('div');
      numEl.className = 'day-number';
      numEl.textContent = dayNum;
      cell.appendChild(numEl);
      // Tasks container
      const tasksEl = document.createElement('div');
      tasksEl.className = 'tasks';
      tasks.filter(t => t.start.slice(0,10) === dateStr).forEach(task => {
        const el = document.createElement('div');
        el.classList.add('task');
        el.classList.add(`planta-${task.plant.replace(/\s/g, '-')}`);
        el.classList.add(`estado-${task.status.replace(/\s/g, '-')}`);
        // Añade clase de urgencia para representar el nivel (afecta el borde del elemento)
        if (task.urgency) {
          el.classList.add(`urgencia-${task.urgency}`);
        }
        el.textContent = task.title;
        el.dataset.id = task.id;
        // Sólo los administradores pueden abrir el modal de edición al hacer clic en una tarea
        if (user && user.role === 'admin') {
          el.addEventListener('click', e => {
            e.stopPropagation();
            openTaskModal(task.id);
          });
        }
        tasksEl.appendChild(el);
      });
      cell.appendChild(tasksEl);
      if (user && !cell.classList.contains('inactive')) {
        cell.addEventListener('click', () => {
          const tasksOnDate = tasks.filter(t => t.start.slice(0,10) === dateStr);
          if (tasksOnDate.length > 0) {
            // Mostrar lista de tareas del día para cualquier rol
            openDayTasksModal(dateStr);
          } else if (user.role === 'admin') {
            // Solo los administradores pueden crear nuevas tareas directamente desde el calendario
            openTaskModal(null, dateStr);
          }
        });
      }
      calendarEl.appendChild(cell);
    }
    // Mostrar el botón "Agregar tarea" sólo a los administradores
    if (user && user.role === 'admin') {
      addTaskBtn.style.display = 'inline-block';
    } else {
      addTaskBtn.style.display = 'none';
    }
  }

  /**
   * Abre el modal para agregar o editar una tarea.
   * @param {number|null} id Si null es nueva tarea
   * @param {string|undefined} dateStr fecha preseleccionada
   */
  function openTaskModal(id, dateStr) {
    const user = getCurrentUser();
    // Sólo los administradores pueden abrir el formulario de tareas
    if (!user || user.role !== 'admin') return;
    const tasks = getTasks();
    let task = null;
    let isNew = id == null;
    if (!isNew) {
      task = tasks.find(t => t.id === id);
      if (!task) return;
    }
    // Crear modal content
    modalContainer.innerHTML = '';
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    const form = document.createElement('form');
    form.innerHTML = `
      <h3>${isNew ? 'Agregar tarea' : 'Editar tarea'}</h3>
      <input type="hidden" id="taskId" value="${isNew ? '' : task.id}">
      <label for="taskTitle">Título / Descripción</label>
      <input type="text" id="taskTitle" required value="${isNew ? '' : task.title}">
      <label for="taskCategory">Tipo de actividad</label>
      <select id="taskCategory" required>
        <option value="máquina">Máquina</option>
        <option value="infraestructura">Infraestructura</option>
        <option value="administrativo">Administrativo</option>
      </select>
      <label for="taskPlant">Planta</label>
      <select id="taskPlant" required ${user.role === 'manager' ? 'disabled' : ''}>
        <option value="San Martin" ${(!isNew && task.plant === 'San Martin') || (isNew && user.plant === 'San Martin') ? 'selected' : ''}>Planta San Martín</option>
        <option value="Versalles" ${(!isNew && task.plant === 'Versalles') || (isNew && user.plant === 'Versalles') ? 'selected' : ''}>Planta Versalles</option>
      </select>
      <div id="machineGroup" style="display:none;">
        <label for="taskMachine">Máquina</label>
        <select id="taskMachine">
          <option value="">-- Ninguna --</option>
        </select>
      </div>
      <label for="taskDate">Fecha y hora</label>
      <input type="datetime-local" id="taskDate" required>
      <label for="taskUrgency">Nivel de urgencia</label>
      <select id="taskUrgency" required>
        ${URGENCY_LEVELS.map(l => `<option value="${l.value}">${l.label}</option>`).join('')}
      </select>
      <label for="taskTechnician">Encargado/Responsable</label>
      <input type="text" id="taskTechnician" value="${!isNew ? (task.technician || '') : ''}">
      <label for="taskStatus">Estado</label>
      <select id="taskStatus">
        <option value="pendiente">Pendiente</option>
        <option value="aceptada">Aceptada</option>
        <option value="en progreso">En progreso</option>
        <option value="completada">Completada</option>
        <option value="cancelada">Cancelada</option>
      </select>
      <div class="modal-actions">
        ${isNew ? '' : '<button type="button" id="deleteTaskBtn" class="delete-btn">Eliminar</button>'}
        <button type="button" id="cancelTaskBtn" class="cancel-btn">Cancelar</button>
        <button type="submit" class="save-btn">${isNew ? 'Guardar' : 'Actualizar'}</button>
      </div>
    `;
    modal.appendChild(form);
    modalContainer.appendChild(modal);
    overlay.style.display = 'block';
    modalContainer.style.display = 'block';
    // Obtener referencias a los campos
    const categorySelect = form.querySelector('#taskCategory');
    const plantSelect = form.querySelector('#taskPlant');
    const machineGroup = form.querySelector('#machineGroup');
    const machineSelect = form.querySelector('#taskMachine');
    // Función para llenar las opciones de máquina según planta seleccionada
    function fillMachineOptions() {
      machineSelect.innerHTML = '<option value="">-- Ninguna --</option>';
      const selectedPlant = plantSelect.value;
      getMachines().filter(m => !selectedPlant || m.plant === selectedPlant).forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name;
        if (!isNew && task.machineId === m.id) opt.selected = true;
        machineSelect.appendChild(opt);
      });
    }
    // Mostrar u ocultar el grupo de máquina según categoría
    function updateCategoryVisibility() {
      const cat = categorySelect.value;
      if (cat === 'máquina') {
        machineGroup.style.display = 'block';
        fillMachineOptions();
      } else {
        machineGroup.style.display = 'none';
      }
    }
    // Preseleccionar categoría
    if (!isNew && task.category) {
      categorySelect.value = task.category;
    } else {
      categorySelect.value = 'máquina';
    }
    // Llenar opciones al inicio si corresponde
    updateCategoryVisibility();
    // Escuchar cambios en planta y categoría
    plantSelect.addEventListener('change', () => {
      if (categorySelect.value === 'máquina') {
        fillMachineOptions();
      }
    });
    categorySelect.addEventListener('change', updateCategoryVisibility);
    // Rellenar fecha
    const dateInput = form.querySelector('#taskDate');
    if (isNew) {
      const d = dateStr ? dateStr + 'T09:00' : new Date().toISOString().slice(0,16);
      dateInput.value = d;
    } else {
      dateInput.value = task.start.slice(0,16);
    }
    // Rellenar estado
    const statusSelect = form.querySelector('#taskStatus');
    if (!isNew) statusSelect.value = task.status;
    // Rellenar urgencia
    const urgencySelect = form.querySelector('#taskUrgency');
    if (!isNew) {
      urgencySelect.value = task.urgency || 'baja';
    } else {
      urgencySelect.value = 'baja';
    }
    // Deshabilitar estado para manager
    if (user.role === 'manager') {
      // Manager solo puede cancelar o completar si aceptada/en progreso
      statusSelect.innerHTML = '';
      const current = task ? task.status : 'pendiente';
      const optCurrent = document.createElement('option');
      optCurrent.value = current;
      optCurrent.textContent = current.charAt(0).toUpperCase() + current.slice(1);
      statusSelect.appendChild(optCurrent);
      if (current !== 'cancelada' && current !== 'completada') {
        const optCancel = document.createElement('option');
        optCancel.value = 'cancelada';
        optCancel.textContent = 'Cancelada';
        statusSelect.appendChild(optCancel);
      }
      if (current === 'en progreso' || current === 'aceptada') {
        const optComp = document.createElement('option');
        optComp.value = 'completada';
        optComp.textContent = 'Completada';
        statusSelect.appendChild(optComp);
      }
    }
    // Manejo de botones
    form.querySelector('#cancelTaskBtn').addEventListener('click', closeModal);
    if (!isNew) {
      form.querySelector('#deleteTaskBtn').addEventListener('click', () => {
        if (confirm('¿Está seguro de eliminar esta tarea?')) {
          const idx = tasks.findIndex(t => t.id === task.id);
          if (idx >= 0) tasks.splice(idx, 1);
          saveTasks(tasks);
          closeModal();
          renderCalendar();
        }
      });
    }
    form.addEventListener('submit', e => {
      e.preventDefault();
      const newTasks = getTasks();
      const idVal = isNew ? getNextId(newTasks) : task.id;
      // Construir nueva tarea
      const category = form.querySelector('#taskCategory').value;
      let machineIdVal = null;
      if (category === 'máquina') {
        const selected = form.querySelector('#taskMachine').value;
        machineIdVal = selected ? parseInt(selected, 10) : null;
      }
      const newTask = {
        id: idVal,
        title: form.querySelector('#taskTitle').value.trim(),
        category: category,
        plant: user.role === 'manager' ? user.plant : form.querySelector('#taskPlant').value,
        machineId: machineIdVal,
        start: form.querySelector('#taskDate').value,
        end: form.querySelector('#taskDate').value,
        status: form.querySelector('#taskStatus').value,
        urgency: form.querySelector('#taskUrgency').value,
        technician: form.querySelector('#taskTechnician').value.trim(),
        createdBy: user.username
      };
      if (isNew) {
        newTasks.push(newTask);
      } else {
        const idx = newTasks.findIndex(t => t.id === idVal);
        if (idx >= 0) newTasks[idx] = newTask;
      }
      saveTasks(newTasks);
      closeModal();
      renderCalendar();
    });
  }

  /**
   * Muestra un modal con el listado de tareas programadas para una fecha específica.
   * Permite ver detalles y, para administradores o encargados, editar la tarea haciendo clic.
   * @param {string} dateStr Fecha en formato YYYY-MM-DD
   */
  function openDayTasksModal(dateStr) {
    const user = getCurrentUser();
    const allTasks = getTasks();
    const tasksForDay = allTasks.filter(t => t.start.slice(0,10) === dateStr);
    if (!tasksForDay.length) return;
    modalContainer.innerHTML = '';
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    const content = document.createElement('div');
    const [y, m, d] = dateStr.split('-');
    const readableDate = new Date(dateStr).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
    let html = `<h3>Tareas del ${readableDate}</h3>`;
    if (!tasksForDay.length) {
      html += '<p>No hay tareas para esta fecha.</p>';
    } else {
      html += '<ul style="list-style:none;padding:0;">';
      tasksForDay.forEach(t => {
        const machineName = getMachineName(t.machineId);
        const time = t.start.slice(11,16);
        const urgencyLabel = URGENCY_LEVELS.find(u => u.value === (t.urgency || 'baja'))?.label || '';
        // Si la tarea proviene de una solicitud, obtener descripción y requisitos
        let extraInfo = '';
        if (t.linkedRequestId) {
          const reqObj = getRequests().find(r => r.id === t.linkedRequestId);
          if (reqObj) {
            if (reqObj.description) extraInfo += `<br><small>${reqObj.description}</small>`;
            if (reqObj.requirements) extraInfo += `<br><small>Requisitos: ${reqObj.requirements}</small>`;
            // Mostrar fecha de resolución si existe
            if (reqObj.resolutionDate) extraInfo += `<br><small>Fecha de resolución: ${reqObj.resolutionDate.slice(0,16).replace('T',' ')}</small>`;
          }
        }
        html += `<li style="margin-bottom:0.5rem; padding:0.4rem; border:1px solid var(--secondary); border-radius:4px; background-color:var(--accent); cursor:${user && user.role !== 'viewer' ? 'pointer' : 'default'}" data-id="${t.id}">
          <strong>${t.title}</strong><br>
          <small>${time} – ${machineName || 'Sin máquina'} – ${t.plant} – Urgencia: ${urgencyLabel}</small><br>
          <small>Estado: ${t.status}</small>
          ${extraInfo}
        </li>`;
      });
      html += '</ul>';
    }
    content.innerHTML = html;
    modal.appendChild(content);
    // Botón cerrar
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Cerrar';
    closeBtn.className = 'cancel-btn';
    closeBtn.addEventListener('click', closeModal);
    actions.appendChild(closeBtn);
    modal.appendChild(actions);
    modalContainer.appendChild(modal);
    overlay.style.display = 'block';
    modalContainer.style.display = 'block';
    // Si el usuario es administrador, permitir clic en cada tarea para editar
    if (user && user.role === 'admin') {
      modal.querySelectorAll('li[data-id]').forEach(li => {
        li.addEventListener('click', () => {
          const id = parseInt(li.dataset.id, 10);
          closeModal();
          openTaskModal(id);
        });
      });
    }
  }

  /**
   * Cierra el modal genérico.
   */
  function closeModal() {
    modalContainer.style.display = 'none';
    overlay.style.display = 'none';
    modalContainer.innerHTML = '';
  }

  // Navegación de calendario
  prevMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  nextMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });
  addTaskBtn.addEventListener('click', () => openTaskModal(null));

  // ================ Sección de máquinas ==================
  const machinesListEl = document.getElementById('machinesList');
  const machineDetailsEl = document.getElementById('machineDetails');
  const addMachineBtn = document.getElementById('addMachineBtn');

  function getMachines() {
    return getStorage('machines', []);
  }
  function saveMachines(arr) {
    setStorage('machines', arr);
  }

  function renderMachines() {
    const user = getCurrentUser();
    let machines = getMachines();
    // Filtrar por planta si hay filtro seleccionado
    const plantFilterEl = document.getElementById('machinePlantFilter');
    if (plantFilterEl) {
      const filterVal = plantFilterEl.value;
      if (filterVal) {
        machines = machines.filter(m => m.plant === filterVal);
      }
    }
    machinesListEl.innerHTML = '';
    // Sólo los administradores pueden agregar o editar máquinas
    if (user && user.role === 'admin') {
      addMachineBtn.style.display = 'inline-block';
    } else {
      addMachineBtn.style.display = 'none';
    }
    machines.forEach(m => {
      const item = document.createElement('div');
      item.className = 'machine-item';
      item.textContent = m.name;
      item.dataset.id = m.id;
      item.addEventListener('click', () => showMachineDetails(m.id));
      machinesListEl.appendChild(item);
    });
    // Clear details if none selected
    if (!machines.length) {
      machineDetailsEl.innerHTML = '<p>No hay máquinas registradas.</p>';
    }
  }

  function showMachineDetails(id) {
    const machines = getMachines();
    const machine = machines.find(m => m.id === id);
    if (!machine) return;
    // Set active item
    document.querySelectorAll('.machine-item').forEach(el => {
      el.classList.toggle('active', parseInt(el.dataset.id, 10) === id);
    });
    machineDetailsEl.innerHTML = '';
    // Crear contenedor superior con imagen y especificaciones en línea
    const topRow = document.createElement('div');
    // Usamos una clase distinta para la fila superior para evitar el uso de estilos flex
    // del contenedor principal. Esta clase se define en el CSS.
    topRow.className = 'machine-top-row';
    // Imagen
    if (machine.image) {
      const img = document.createElement('img');
      img.src = machine.image;
      topRow.appendChild(img);
    }
    // Contenedor de especificaciones
    const grid = document.createElement('div');
    grid.className = 'details-grid';
    function addRow(label, value) {
      const l = document.createElement('div');
      l.className = 'label';
      l.textContent = label;
      const v = document.createElement('div');
      v.textContent = value || '';
      grid.appendChild(l);
      grid.appendChild(v);
    }
    addRow('Nombre', machine.name);
    addRow('Modelo', machine.model);
    addRow('Nº de serie', machine.serial);
    addRow('Planta', machine.plant);
    addRow('Altura', machine.height);
    addRow('Ancho', machine.width);
    addRow('Largo', machine.length);
    addRow('Peso', machine.weight);
    addRow('Voltaje', machine.voltage);
    topRow.appendChild(grid);
    machineDetailsEl.appendChild(topRow);
    // Historial de mantenimientos y tareas en una tabla debajo
    const combinedTitle = document.createElement('h4');
    combinedTitle.textContent = 'Historial de mantenimientos y tareas';
    const combinedTable = document.createElement('table');
    combinedTable.className = 'data-table';
    combinedTable.innerHTML = '<thead><tr><th>Fecha</th><th>Tipo / Título</th><th>Observaciones</th><th>Reemplazo de repuestos</th><th>Estado</th><th>Responsable</th></tr></thead><tbody></tbody>';
    const tbody = combinedTable.querySelector('tbody');
    // Agregar tareas del calendario asociadas a esta máquina
    const tasks = getTasks().filter(t => t.machineId === machine.id);
    tasks.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${t.start.slice(0,10)}</td><td>${t.title}</td><td></td><td></td><td>${t.status}</td><td>${t.technician || ''}</td>`;
      tbody.appendChild(tr);
    });
    // Agregar registros históricos de mantenimiento
    const records = getMaintenances().filter(r => r.machineId === machine.id);
    records.forEach(r => {
      const tr = document.createElement('tr');
      const statusClass = r.status === 'completada' ? 'mant-status-completada' : 'mant-status-no-completada';
      tr.innerHTML = `<td>${r.date.slice(0,10)}</td><td>${r.type.charAt(0).toUpperCase() + r.type.slice(1)}</td><td>${r.observations || ''}</td><td>${r.replacement || ''}</td><td><span class="${statusClass}">${r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span></td><td>${r.responsible || ''}</td>`;
      tbody.appendChild(tr);
    });
    if (tasks.length + records.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.textContent = 'No hay mantenimientos registrados.';
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
    machineDetailsEl.appendChild(combinedTitle);
    machineDetailsEl.appendChild(combinedTable);
    // Controls: sólo administradores pueden editar/eliminar; se permite añadir historial de mantenimiento a administradores
    const userRole = getCurrentUser()?.role;
    const actions = document.createElement('div');
    actions.style.marginTop = '0.5rem';
    if (userRole === 'admin') {
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Editar';
      editBtn.className = 'primary-btn';
      editBtn.addEventListener('click', () => openMachineModal(id));
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Eliminar';
      delBtn.className = 'delete-btn';
      delBtn.addEventListener('click', () => {
        if (confirm('¿Eliminar esta máquina?')) {
          const arr = getMachines();
          const idx = arr.findIndex(m => m.id === id);
          if (idx >= 0) arr.splice(idx,1);
          saveMachines(arr);
          renderMachines();
          machineDetailsEl.innerHTML = '<p>Selecciona una máquina para ver detalles</p>';
        }
      });
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
    }
    // Botón para agregar mantenimiento histórico (solo admins)
    if (userRole === 'admin') {
      const addMaintBtn = document.createElement('button');
      addMaintBtn.textContent = 'Agregar mantenimiento';
      addMaintBtn.className = 'primary-btn';
      addMaintBtn.style.marginLeft = '0.5rem';
      addMaintBtn.addEventListener('click', () => openMaintenanceModal(id, null));
      actions.appendChild(addMaintBtn);
    }
    if (actions.children.length > 0) {
      machineDetailsEl.appendChild(actions);
    }
  }

  addMachineBtn.addEventListener('click', () => openMachineModal(null));

  function openMachineModal(id) {
    const user = getCurrentUser();
    if (!user || user.role === 'viewer') return;
    const machines = getMachines();
    const isNew = id == null;
    const machine = isNew ? null : machines.find(m => m.id === id);
    modalContainer.innerHTML = '';
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    modal.innerHTML = `
      <form id="machineForm">
        <h3>${isNew ? 'Agregar máquina' : 'Editar máquina'}</h3>
        <input type="hidden" id="machineId" value="${isNew ? '' : machine.id}">
        <label for="machineName">Nombre de máquina</label>
        <input type="text" id="machineName" required value="${isNew ? '' : machine.name}">
        <label for="machineModel">Modelo</label>
        <input type="text" id="machineModel" value="${isNew ? '' : machine.model}">
        <label for="machineSerial">Número de serie</label>
        <input type="text" id="machineSerial" value="${isNew ? '' : machine.serial}">
        <label for="machinePlant">Planta</label>
        <select id="machinePlant">
          <option value="San Martin" ${!isNew && machine.plant === 'San Martin' ? 'selected' : ''}>Planta San Martín</option>
          <option value="Versalles" ${!isNew && machine.plant === 'Versalles' ? 'selected' : ''}>Planta Versalles</option>
        </select>
        <label for="machineHeight">Altura (cm)</label>
        <input type="number" id="machineHeight" value="${isNew ? '' : machine.height}">
        <label for="machineWidth">Ancho (cm)</label>
        <input type="number" id="machineWidth" value="${isNew ? '' : machine.width}">
        <label for="machineLength">Largo (cm)</label>
        <input type="number" id="machineLength" value="${isNew ? '' : machine.length}">
        <label for="machineWeight">Peso (kg)</label>
        <input type="number" id="machineWeight" value="${isNew ? '' : machine.weight}">
        <label for="machineVoltage">Voltaje</label>
        <input type="text" id="machineVoltage" value="${isNew ? '' : machine.voltage}">
        <label for="machineImage">Imagen</label>
        <input type="file" id="machineImage" accept="image/*">
        <div class="modal-actions">
          <button type="button" id="cancelMachine" class="cancel-btn">Cancelar</button>
          <button type="submit" class="save-btn">${isNew ? 'Guardar' : 'Actualizar'}</button>
        </div>
      </form>
    `;
    modalContainer.appendChild(modal);
    overlay.style.display = 'block';
    modalContainer.style.display = 'block';
    // Form submit
    const form = modal.querySelector('#machineForm');
    form.querySelector('#cancelMachine').addEventListener('click', closeModal);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const arr = getMachines();
      const mId = isNew ? getNextId(arr) : machine.id;
      // Leer imagen y convertir a dataURL si se seleccionó
      const fileInput = form.querySelector('#machineImage');
      let dataUrl = isNew ? null : machine.image || null;
      if (fileInput.files && fileInput.files[0]) {
        dataUrl = await fileToDataURL(fileInput.files[0]);
      }
      const newMachine = {
        id: mId,
        name: form.querySelector('#machineName').value.trim(),
        model: form.querySelector('#machineModel').value.trim(),
        serial: form.querySelector('#machineSerial').value.trim(),
        plant: form.querySelector('#machinePlant').value,
        height: form.querySelector('#machineHeight').value,
        width: form.querySelector('#machineWidth').value,
        length: form.querySelector('#machineLength').value,
        weight: form.querySelector('#machineWeight').value,
        voltage: form.querySelector('#machineVoltage').value.trim(),
        image: dataUrl
      };
      if (isNew) {
        arr.push(newMachine);
      } else {
        const idx = arr.findIndex(m => m.id === mId);
        if (idx >= 0) arr[idx] = newMachine;
      }
      saveMachines(arr);
      closeModal();
      renderMachines();
      showMachineDetails(mId);
    });
  }

  /**
   * Convierte un archivo a DataURL.
   */
  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = e => reject(e);
      reader.readAsDataURL(file);
    });
  }

  // ============ Mantenimientos históricos de máquinas ============
  /**
   * Recupera el historial de mantenimientos de todas las máquinas.
   * Cada registro incluye máquinaId, fecha, tipo, observaciones, repuestos, estado y responsable.
   */
  function getMaintenances() {
    return getStorage('maintenances', []);
  }

  /**
   * Guarda el historial de mantenimientos en localStorage.
   * @param {Array} arr
   */
  function saveMaintenances(arr) {
    setStorage('maintenances', arr);
  }

  /**
   * Renderiza la tabla de mantenimientos para una máquina específica.
   * @param {number} machineId
   */
  function renderMaintenanceTable(machineId) {
    // Buscar contenedor de tabla de mantenimientos dentro de machineDetailsEl
    const existing = machineDetailsEl.querySelector('#maintenanceTable');
    if (existing) existing.remove();
    const maintTitle = document.createElement('h4');
    maintTitle.textContent = 'Historial de mantenimientos';
    const table = document.createElement('table');
    table.id = 'maintenanceTable';
    table.className = 'data-table';
    table.innerHTML = '<thead><tr><th>Fecha</th><th>Tipo</th><th>Observaciones</th><th>Reemplazo de repuestos</th><th>Estado</th><th>Responsable</th></tr></thead><tbody></tbody>';
    const tbody = table.querySelector('tbody');
    const records = getMaintenances().filter(r => r.machineId === machineId);
    records.forEach(r => {
      const tr = document.createElement('tr');
      const typeClass = r.type ? `mant-type-${r.type}` : '';
      const statusClass = r.status === 'completada' ? 'mant-status-completada' : 'mant-status-no-completada';
      tr.innerHTML = `<td>${r.date.slice(0,10)}</td><td><span class="${typeClass}">${r.type.charAt(0).toUpperCase() + r.type.slice(1)}</span></td><td>${r.observations || ''}</td><td>${r.replacement || ''}</td><td><span class="${statusClass}">${r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span></td><td>${r.responsible || ''}</td>`;
      tbody.appendChild(tr);
    });
    if (records.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.textContent = 'No hay mantenimientos registrados.';
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
    machineDetailsEl.appendChild(maintTitle);
    machineDetailsEl.appendChild(table);
  }

  /**
   * Abre modal para agregar o editar un mantenimiento histórico.
   * @param {number} machineId
   * @param {number|null} recordId
   */
  function openMaintenanceModal(machineId, recordId) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') return;
    const maints = getMaintenances();
    const isNew = recordId == null;
    const record = isNew ? null : maints.find(x => x.id === recordId);
    modalContainer.innerHTML = '';
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    modal.innerHTML = `
      <form id="maintenanceForm">
        <h3>${isNew ? 'Agregar mantenimiento' : 'Editar mantenimiento'}</h3>
        <label for="maintDate">Fecha y hora</label>
        <input type="datetime-local" id="maintDate" required value="${isNew ? new Date().toISOString().slice(0,16) : record.date}">
        <label for="maintType">Tipo de mantenimiento</label>
        <select id="maintType" required>
          <option value="preventivo" ${!isNew && record.type === 'preventivo' ? 'selected' : ''}>Preventivo</option>
          <option value="correctivo" ${!isNew && record.type === 'correctivo' ? 'selected' : ''}>Correctivo</option>
          <option value="intervencion" ${!isNew && record.type === 'intervencion' ? 'selected' : ''}>Intervención</option>
        </select>
        <label for="maintObs">Observaciones</label>
        <textarea id="maintObs" rows="3">${isNew ? '' : record.observations || ''}</textarea>
        <label for="maintReplacement">Reemplazo de repuestos</label>
        <input type="text" id="maintReplacement" value="${isNew ? '' : record.replacement || ''}">
        <label for="maintStatus">Estado</label>
        <select id="maintStatus">
          <option value="completada" ${!isNew && record.status === 'completada' ? 'selected' : ''}>Completada</option>
          <option value="no completada" ${!isNew && record.status === 'no completada' ? 'selected' : ''}>No completada</option>
        </select>
        <label for="maintResponsible">Responsable</label>
        <input type="text" id="maintResponsible" value="${isNew ? '' : record.responsible || ''}">
        <div class="modal-actions">
          <button type="button" id="cancelMaint" class="cancel-btn">Cancelar</button>
          <button type="submit" class="save-btn">${isNew ? 'Guardar' : 'Actualizar'}</button>
        </div>
      </form>
    `;
    modalContainer.appendChild(modal);
    overlay.style.display = 'block';
    modalContainer.style.display = 'block';
    modal.querySelector('#cancelMaint').addEventListener('click', closeModal);
    modal.querySelector('#maintenanceForm').addEventListener('submit', e => {
      e.preventDefault();
      const arr = getMaintenances();
      const newId = isNew ? getNextId(arr) : record.id;
      const newRecord = {
        id: newId,
        machineId: machineId,
        date: modal.querySelector('#maintDate').value,
        type: modal.querySelector('#maintType').value,
        observations: modal.querySelector('#maintObs').value.trim(),
        replacement: modal.querySelector('#maintReplacement').value.trim(),
        status: modal.querySelector('#maintStatus').value,
        responsible: modal.querySelector('#maintResponsible').value.trim()
      };
      if (isNew) {
        arr.push(newRecord);
      } else {
        const idx = arr.findIndex(x => x.id === newId);
        if (idx >= 0) arr[idx] = newRecord;
      }
      saveMaintenances(arr);
      closeModal();
      showMachineDetails(machineId);
      renderMaintenanceTable(machineId);
    });
  }

  // ============== Secciones restantes (simplificadas) ==============
  // Requests (solicitudes)
  const requestsTableBody = document.querySelector('#requestsTable tbody');
  const addRequestBtn = document.getElementById('addRequestBtn');
  function getRequests() { return getStorage('requests', []); }
  function saveRequests(arr) { setStorage('requests', arr); }

  /**
   * Elimina una solicitud por ID y actualiza almacenamiento y vista.
   * @param {number} id
   */
  function deleteRequest(id) {
    const arr = getRequests();
    const idx = arr.findIndex(r => r.id === id);
    if (idx >= 0) {
      arr.splice(idx, 1);
      saveRequests(arr);
      renderRequests();
    }
  }
  function renderRequests() {
    const user = getCurrentUser();
    const requests = getRequests();
    requestsTableBody.innerHTML = '';
    if (user && user.role !== 'viewer') {
      addRequestBtn.style.display = 'inline-block';
    } else {
      addRequestBtn.style.display = 'none';
    }
    requests.forEach(req => {
      const tr = document.createElement('tr');
      // Obtener etiqueta de urgencia con color
      const level = req.urgency || 'baja';
      const levelLabel = URGENCY_LEVELS.find(u => u.value === level)?.label || '';
      const urgencyHtml = `<span class="urgencia-label urgencia-${level}-label">${levelLabel}</span>`;
      const isAdmin = user && user.role === 'admin';
      const isManager = user && user.role === 'manager';
      // Capitalizar estado para mostrar primera letra mayúscula
      const statusLabel = req.status ? req.status.charAt(0).toUpperCase() + req.status.slice(1) : '';
      let actionsHtml = '';
      if (isAdmin) {
        actionsHtml = `<button class="primary-btn btn-sm edit-req-btn" data-id="${req.id}" style="margin-right:4px;">Editar</button><button class="danger-btn btn-sm delete-req-btn" data-id="${req.id}">Eliminar</button>`;
      } else if (isManager) {
        // Los encargados solo pueden editar su urgencia y descripción
        actionsHtml = `<button class="primary-btn btn-sm edit-req-btn" data-id="${req.id}">Editar</button>`;
      }
      tr.innerHTML = `
        <td>${req.title}</td>
        <td>${req.date.slice(0,10)}</td>
        <td>${req.plant || ''}</td>
        <td>${getMachineName(req.machineId)}</td>
        <td>${urgencyHtml}</td>
        <td>${statusLabel}</td>
        <td>${actionsHtml}</td>
      `;
      // Eventos de botones
      if (isAdmin || isManager) {
        const editBtn = tr.querySelector('.edit-req-btn');
        editBtn?.addEventListener('click', e => {
          e.stopPropagation();
          openRequestModal(req.id);
        });
        if (isAdmin) {
          const delBtn = tr.querySelector('.delete-req-btn');
          delBtn?.addEventListener('click', e => {
            e.stopPropagation();
            if (confirm('¿Eliminar esta solicitud?')) {
              deleteRequest(req.id);
            }
          });
        }
      }
      // Clic en fila para ver detalles para usuarios que no pueden editar
      tr.addEventListener('click', () => {
        if (!(isAdmin || isManager)) {
          viewRequestModal(req.id);
        }
      });
      requestsTableBody.appendChild(tr);
    });
    if (!requests.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 7;
      td.textContent = 'No hay solicitudes registradas.';
      tr.appendChild(td);
      requestsTableBody.appendChild(tr);
    }
  }
  addRequestBtn.addEventListener('click', () => openRequestModal(null));
  function openRequestModal(id) {
    const user = getCurrentUser();
    if (!user) return;
    const requests = getRequests();
    const isNew = id == null;
    const req = isNew ? null : requests.find(r => r.id === id);
    modalContainer.innerHTML = '';
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    modal.innerHTML = `
      <form id="requestForm">
        <h3>${isNew ? 'Agregar solicitud' : 'Editar solicitud'}</h3>
        <input type="hidden" id="requestId" value="${isNew ? '' : req.id}">
        <label for="requestTitle">Título</label>
        <input type="text" id="requestTitle" required value="${isNew ? '' : req.title}">
        <label for="requestCategory">Tipo de actividad</label>
        <select id="requestCategory">
          <option value="máquina">Máquina</option>
          <option value="infraestructura">Infraestructura</option>
          <option value="administrativo">Administrativo</option>
        </select>
        <label for="requestDate">Fecha</label>
        <input type="datetime-local" id="requestDate" required value="${isNew ? new Date().toISOString().slice(0,16) : req.date}">
        <label for="requestPlant">Planta</label>
        <select id="requestPlant">
          <option value="San Martin" ${(isNew && user.plant === 'San Martin') || (!isNew && req.plant === 'San Martin') ? 'selected' : ''}>Planta San Martín</option>
          <option value="Versalles" ${(isNew && user.plant === 'Versalles') || (!isNew && req.plant === 'Versalles') ? 'selected' : ''}>Planta Versalles</option>
        </select>
        <div id="reqMachineGroup" style="display:none;">
          <label for="requestMachine">Máquina</label>
          <select id="requestMachine">
            <option value="">-- Ninguna --</option>
          </select>
        </div>
        <label for="requestUrgency">Nivel de urgencia</label>
        <select id="requestUrgency">
          ${URGENCY_LEVELS.map(l => `<option value="${l.value}">${l.label}</option>`).join('')}
        </select>
        <label for="requestImage">Foto (opcional)</label>
        <input type="file" id="requestImage" accept="image/*">
        <label for="requestDesc">Descripción</label>
        <textarea id="requestDesc" rows="3">${isNew ? '' : req.description || ''}</textarea>
        <label for="requestRequirements">Requisitos</label>
        <textarea id="requestRequirements" rows="2">${isNew ? '' : (req.requirements || '')}</textarea>
        <label for="requestStatus">Estado</label>
        <select id="requestStatus" ${user.role === 'viewer' || user.role === 'manager' ? 'disabled' : ''}>
          <option value="pendiente">Pendiente</option>
          <option value="en revisión">En revisión</option>
          <option value="aprobada">Aprobada</option>
          <option value="rechazada">Rechazada</option>
        </select>
        ${user.role === 'admin' ? `<label for="requestResolution">Fecha de resolución</label><input type="datetime-local" id="requestResolution">` : ''}
        <div class="modal-actions">
          <button type="button" id="cancelRequest" class="cancel-btn">Cancelar</button>
          <button type="submit" class="save-btn">${isNew ? 'Guardar' : 'Actualizar'}</button>
        </div>
      </form>
    `;
    modalContainer.appendChild(modal);
    overlay.style.display = 'block';
    modalContainer.style.display = 'block';
    // Si es admin y estamos editando una solicitud con fecha de resolución, rellenar el campo
    if (user.role === 'admin' && !isNew) {
      const resInput = modal.querySelector('#requestResolution');
      if (resInput) {
        resInput.value = req.resolutionDate || '';
      }
    }
    // Controles
    const categorySel = modal.querySelector('#requestCategory');
    const plantSel = modal.querySelector('#requestPlant');
    const machineGroup = modal.querySelector('#reqMachineGroup');
    const machineSel = modal.querySelector('#requestMachine');
    // Función para llenar máquinas según planta
    function fillReqMachines() {
      machineSel.innerHTML = '<option value="">-- Ninguna --</option>';
      const selectedPlant = plantSel.value;
      getMachines().filter(m => !selectedPlant || m.plant === selectedPlant).forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name;
        if (!isNew && req && req.machineId === m.id) opt.selected = true;
        machineSel.appendChild(opt);
      });
    }
    // Mostrar u ocultar grupo de máquina
    function updateReqCategory() {
      const cat = categorySel.value;
      if (cat === 'máquina') {
        machineGroup.style.display = 'block';
        fillReqMachines();
      } else {
        machineGroup.style.display = 'none';
      }
    }
    // Preseleccionar categoría
    if (!isNew && req && req.category) {
      categorySel.value = req.category;
    } else {
      categorySel.value = 'máquina';
    }
    updateReqCategory();
    // Cambios en planta
    plantSel.addEventListener('change', () => {
      if (categorySel.value === 'máquina') fillReqMachines();
    });
    // Cambios en categoría
    categorySel.addEventListener('change', updateReqCategory);
    // Preseleccionar estado y urgencia
    const statusSel = modal.querySelector('#requestStatus');
    if (!isNew && req) statusSel.value = req.status;
    const urgSel = modal.querySelector('#requestUrgency');
    if (!isNew && req && req.urgency) urgSel.value = req.urgency;
    // Cancelar
    modal.querySelector('#cancelRequest').addEventListener('click', closeModal);
    // Submit
    modal.querySelector('#requestForm').addEventListener('submit', async e => {
      e.preventDefault();
      const arr = getRequests();
      const rId = isNew ? getNextId(arr) : req.id;
      let imageData = isNew ? null : (req && req.image) || null;
      // Leer imagen (si existe)
      const fileInput = modal.querySelector('#requestImage');
      if (fileInput.files && fileInput.files[0]) {
        imageData = await fileToDataURL(fileInput.files[0]);
      }
      const newReq = {
        id: rId,
        title: modal.querySelector('#requestTitle').value.trim(),
        date: modal.querySelector('#requestDate').value,
        category: modal.querySelector('#requestCategory').value,
        machineId: (() => {
          const cat = modal.querySelector('#requestCategory').value;
          if (cat === 'máquina') {
            const val = modal.querySelector('#requestMachine').value;
            return val ? parseInt(val, 10) : null;
          }
          return null;
        })(),
        urgency: modal.querySelector('#requestUrgency').value,
        image: imageData,
        description: modal.querySelector('#requestDesc').value.trim(),
        status: user.role === 'admin' ? modal.querySelector('#requestStatus').value : (isNew ? 'pendiente' : req.status),
        createdBy: user.username,
        plant: modal.querySelector('#requestPlant').value,
        resolutionDate: user.role === 'admin' ? (modal.querySelector('#requestResolution')?.value || '') : (req ? req.resolutionDate : '')
        ,
        requirements: modal.querySelector('#requestRequirements').value.trim()
      };
      if (isNew) arr.push(newReq);
      else {
        const idx = arr.findIndex(r => r.id === rId);
        if (idx >= 0) arr[idx] = newReq;
      }
      saveRequests(arr);
      // Si el usuario es administrador, crear o actualizar tarea asociada a la solicitud
      if (user.role === 'admin') {
        const resDate = newReq.resolutionDate;
        let tasks = getTasks();
        const existingIdx = tasks.findIndex(t => t.linkedRequestId === newReq.id);
        if (resDate) {
          const taskObj = {
            id: existingIdx >= 0 ? tasks[existingIdx].id : getNextId(tasks),
            title: newReq.title,
            category: newReq.category,
            plant: newReq.plant,
            machineId: newReq.category === 'máquina' ? newReq.machineId : null,
            start: resDate,
            end: resDate,
            status: 'pendiente',
            urgency: newReq.urgency,
            technician: '',
            createdBy: newReq.createdBy,
            linkedRequestId: newReq.id
          };
          if (existingIdx >= 0) {
            tasks[existingIdx] = taskObj;
          } else {
            tasks.push(taskObj);
          }
        } else {
          // Si se elimina la fecha de resolución, quitar la tarea vinculada
          if (existingIdx >= 0) {
            tasks.splice(existingIdx, 1);
          }
        }
        saveTasks(tasks);
      }
      closeModal();
      renderRequests();
      // Actualizar calendario por si se agregó o eliminó una tarea vinculada
      renderCalendar();
    });
  }

  /**
   * Muestra una solicitud en modo lectura.
   * Incluye la imagen, si está disponible.
   * @param {number} id
   */
  function viewRequestModal(id) {
    const req = getRequests().find(r => r.id === id);
    if (!req) return;
    modalContainer.innerHTML = '';
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    let html = `<h3>Solicitud</h3>`;
    html += `<p><strong>Título:</strong> ${req.title}</p>`;
    html += `<p><strong>Fecha:</strong> ${req.date.slice(0,16)}</p>`;
    html += `<p><strong>Planta:</strong> ${req.plant || ''}</p>`;
    html += `<p><strong>Categoría:</strong> ${req.category}</p>`;
    html += `<p><strong>Máquina:</strong> ${getMachineName(req.machineId) || 'General'}</p>`;
    const urgLabel = URGENCY_LEVELS.find(u => u.value === (req.urgency || 'baja'))?.label || '';
    html += `<p><strong>Urgencia:</strong> ${urgLabel}</p>`;
    html += `<p><strong>Estado:</strong> ${req.status.charAt(0).toUpperCase() + req.status.slice(1)}</p>`;
    if (req.resolutionDate) {
      html += `<p><strong>Fecha de resolución:</strong> ${req.resolutionDate.slice(0,16).replace('T',' ')}</p>`;
    }
    html += `<p><strong>Descripción:</strong> ${req.description || ''}</p>`;
    if (req.requirements) {
      html += `<p><strong>Requisitos:</strong> ${req.requirements}</p>`;
    }
    if (req.image) {
      html += `<img src="${req.image}" style="max-width:100%;height:auto;margin-bottom:0.5rem;border:1px solid var(--secondary);border-radius:4px;"/>`;
    }
    modal.innerHTML = html;
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Cerrar';
    closeBtn.className = 'cancel-btn';
    closeBtn.addEventListener('click', closeModal);
    actions.appendChild(closeBtn);
    modal.appendChild(actions);
    modalContainer.appendChild(modal);
    overlay.style.display = 'block';
    modalContainer.style.display = 'block';
  }

  function getMachineName(id) {
    if (!id) return '';
    const m = getMachines().find(x => x.id === id);
    return m ? m.name : '';
  }

  // ========== Budgets ==========
  const budgetsTableBody = document.querySelector('#budgetsTable tbody');
  const addBudgetBtn = document.getElementById('addBudgetBtn');
  function getBudgets() { return getStorage('budgets', []); }
  function saveBudgets(arr) { setStorage('budgets', arr); }
  function renderBudgets() {
    const user = getCurrentUser();
    const budgets = getBudgets();
    budgetsTableBody.innerHTML = '';
    if (user && user.role === 'admin') {
      addBudgetBtn.style.display = 'inline-block';
    } else {
      addBudgetBtn.style.display = 'none';
    }
    budgets.forEach(b => {
      const tr = document.createElement('tr');
      // Capitalizar estado
      const statusLabel = b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1) : '';
      // Generar clase eliminando espacios y tildes
      let cls = (b.status || '').toLowerCase();
      cls = cls.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
      const statusClass = 'status-budget-' + cls;
      const statusHtml = `<span class="${statusClass}">${statusLabel}</span>`;
      tr.innerHTML = `
        <td>${b.title}</td>
        <td>${b.date.slice(0,10)}</td>
        <td>${b.amount || ''}</td>
        <td>${statusHtml}</td>
        <td>${b.file ? `<a href="${b.file}" download="${b.fileName || 'archivo.pdf'}" class="primary-btn btn-sm" style="margin-right:4px;">PDF</a>` : ''}<button class="primary-btn btn-sm" data-id="${b.id}">Ver</button></td>
      `;
      const btn = tr.querySelector('button');
      btn.addEventListener('click', () => openBudgetModal(b.id));
      budgetsTableBody.appendChild(tr);
    });
    if (!budgets.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.textContent = 'No hay presupuestos.';
      tr.appendChild(td);
      budgetsTableBody.appendChild(tr);
    }
  }
  addBudgetBtn.addEventListener('click', () => openBudgetModal(null));
  function openBudgetModal(id) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') return;
    const budgets = getBudgets();
    const isNew = id == null;
    const b = isNew ? null : budgets.find(x => x.id === id);
    modalContainer.innerHTML = '';
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    modal.innerHTML = `
      <form id="budgetForm">
        <h3>${isNew ? 'Agregar presupuesto' : 'Editar presupuesto'}</h3>
        <input type="hidden" id="budgetId" value="${isNew ? '' : b.id}">
        <label for="budgetTitle">Título</label>
        <input type="text" id="budgetTitle" required value="${isNew ? '' : b.title}">
        <label for="budgetDate">Fecha</label>
        <input type="date" id="budgetDate" required value="${isNew ? new Date().toISOString().slice(0,10) : b.date.slice(0,10)}">
        <label for="budgetAmount">Monto</label>
        <input type="number" id="budgetAmount" value="${isNew ? '' : b.amount || ''}">
        <label for="budgetStatus">Estado</label>
        <select id="budgetStatus">
          <option value="en revisión">En revisión</option>
          <option value="aprobado">Aprobado</option>
          <option value="rechazado">Rechazado</option>
        </select>
        <label for="budgetDesc">Descripción</label>
        <textarea id="budgetDesc" rows="3">${isNew ? '' : b.description || ''}</textarea>
        <label for="budgetFile">Archivo PDF (opcional)</label>
        <input type="file" id="budgetFile" accept="application/pdf">
        <div class="modal-actions">
          <button type="button" id="cancelBudget" class="cancel-btn">Cancelar</button>
          <button type="submit" class="save-btn">${isNew ? 'Guardar' : 'Actualizar'}</button>
        </div>
      </form>
    `;
    modalContainer.appendChild(modal);
    overlay.style.display = 'block';
    modalContainer.style.display = 'block';
    if (!isNew) modal.querySelector('#budgetStatus').value = b.status;
    modal.querySelector('#cancelBudget').addEventListener('click', closeModal);
    modal.querySelector('#budgetForm').addEventListener('submit', e => {
      e.preventDefault();
      const arr = getBudgets();
      const newId = isNew ? getNextId(arr) : b.id;
      (async () => {
        const fileInput = modal.querySelector('#budgetFile');
        let fileData = isNew ? null : (b && b.file) || null;
        let fileName = isNew ? '' : (b && b.fileName) || '';
        if (fileInput && fileInput.files && fileInput.files[0]) {
          fileData = await fileToDataURL(fileInput.files[0]);
          fileName = fileInput.files[0].name;
        }
        const newBudget = {
          id: newId,
          title: modal.querySelector('#budgetTitle').value.trim(),
          date: modal.querySelector('#budgetDate').value,
          amount: modal.querySelector('#budgetAmount').value,
          status: modal.querySelector('#budgetStatus').value,
          description: modal.querySelector('#budgetDesc').value.trim(),
          file: fileData,
          fileName: fileName
        };
        if (isNew) arr.push(newBudget);
        else {
          const idx = arr.findIndex(x => x.id === newId);
          if (idx >= 0) arr[idx] = newBudget;
        }
        saveBudgets(arr);
        closeModal();
        renderBudgets();
      })();
    });
  }

  // ========== Spare parts (Repuestos) ==========
  const sparePartsTableBody = document.querySelector('#sparePartsTable tbody');
  const addSparePartBtn = document.getElementById('addSparePartBtn');
  function getSpareParts() { return getStorage('spareParts', []); }
  function saveSpareParts(arr) { setStorage('spareParts', arr); }
  function renderSpareParts() {
    const user = getCurrentUser();
    const arr = getSpareParts();
    sparePartsTableBody.innerHTML = '';
    if (user && user.role === 'admin') {
      addSparePartBtn.style.display = 'inline-block';
    } else {
      addSparePartBtn.style.display = 'none';
    }
    arr.forEach(item => {
      const tr = document.createElement('tr');
      const isAdmin = user && user.role === 'admin';
      const imgHTML = item.image ? `<img src="${item.image}" class="tool-thumb"/>` : '';
      tr.innerHTML = `
        <td>${imgHTML}${item.name}</td>
        <td>${item.code}</td>
        <td>${item.qty}</td>
        <td>${getMachineName(item.machineId)}</td>
        <td>${isAdmin ? '<button class="primary-btn btn-sm" data-id="' + item.id + '">Editar</button>' : ''}</td>
      `;
      if (isAdmin) {
        const btn = tr.querySelector('button');
        btn.addEventListener('click', e => {
          e.stopPropagation();
          openSparePartModal(item.id);
        });
      }
      // Para todos los roles, hacer clic en fila muestra detalles (modo lectura) si no es admin
      tr.addEventListener('click', () => {
        if (!isAdmin) viewSparePartModal(item.id);
      });
      sparePartsTableBody.appendChild(tr);
    });
    if (!arr.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.textContent = 'No hay repuestos.';
      tr.appendChild(td);
      sparePartsTableBody.appendChild(tr);
    }
  }
  addSparePartBtn.addEventListener('click', () => openSparePartModal(null));
  function openSparePartModal(id) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') return;
    const arr = getSpareParts();
    const isNew = id == null;
    const sp = isNew ? null : arr.find(x => x.id === id);
    modalContainer.innerHTML = '';
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    modal.innerHTML = `
      <form id="spareForm">
        <h3>${isNew ? 'Agregar repuesto' : 'Editar repuesto'}</h3>
        <input type="hidden" id="spareId" value="${isNew ? '' : sp.id}">
        <label for="spareName">Nombre</label>
        <input type="text" id="spareName" required value="${isNew ? '' : sp.name}">
        <label for="spareCode">Código</label>
        <input type="text" id="spareCode" required value="${isNew ? '' : sp.code}">
        <label for="spareQty">Cantidad</label>
        <input type="number" id="spareQty" value="${isNew ? '' : sp.qty}">
        <label for="spareMachine">Máquina</label>
        <select id="spareMachine">
          <option value="">-- General --</option>
        </select>
        <label for="spareNeeds">Necesita reposición</label>
        <select id="spareNeeds">
          <option value="false" ${isNew || !sp || !sp.needs ? 'selected' : ''}>No</option>
          <option value="true" ${!isNew && sp.needs ? 'selected' : ''}>Sí</option>
        </select>
        <label for="spareImage">Imagen</label>
        <input type="file" id="spareImage" accept="image/*">
        <div class="modal-actions">
          <button type="button" id="cancelSpare" class="cancel-btn">Cancelar</button>
          <button type="submit" class="save-btn">${isNew ? 'Guardar' : 'Actualizar'}</button>
        </div>
      </form>
    `;
    modalContainer.appendChild(modal);
    overlay.style.display = 'block';
    modalContainer.style.display = 'block';
    // Fill machines
    const machineSel = modal.querySelector('#spareMachine');
    getMachines().forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      if (!isNew && sp.machineId === m.id) opt.selected = true;
      machineSel.appendChild(opt);
    });
    modal.querySelector('#cancelSpare').addEventListener('click', closeModal);
    modal.querySelector('#spareForm').addEventListener('submit', async e => {
      e.preventDefault();
      const newId = isNew ? getNextId(arr) : sp.id;
      const fileEl = modal.querySelector('#spareImage');
      let imgData = isNew ? null : (sp && sp.image) || null;
      if (fileEl.files && fileEl.files[0]) {
        // Convertir a dataURL
        const f = fileEl.files[0];
        imgData = await fileToDataURL(f);
      }
      const newSp = {
        id: newId,
        name: modal.querySelector('#spareName').value.trim(),
        code: modal.querySelector('#spareCode').value.trim(),
        qty: modal.querySelector('#spareQty').value,
        machineId: modal.querySelector('#spareMachine').value ? parseInt(modal.querySelector('#spareMachine').value,10) : null,
        needs: modal.querySelector('#spareNeeds').value === 'true',
        image: imgData
      };
      if (isNew) arr.push(newSp);
      else {
        const idx = arr.findIndex(x => x.id === newId);
        if (idx >= 0) arr[idx] = newSp;
      }
      saveSpareParts(arr);
      closeModal();
      renderSpareParts();
    });
  }

  /**
   * Muestra los detalles de un repuesto en modo lectura.
   * @param {number} id
   */
  function viewSparePartModal(id) {
    const item = getSpareParts().find(r => r.id === id);
    if (!item) return;
    modalContainer.innerHTML = '';
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    let html = '<h3>Repuesto</h3>';
    html += `<p><strong>Nombre:</strong> ${item.name}</p>`;
    html += `<p><strong>Código:</strong> ${item.code}</p>`;
    html += `<p><strong>Cantidad:</strong> ${item.qty}</p>`;
    const machineName = getMachineName(item.machineId);
    html += `<p><strong>Máquina:</strong> ${machineName || 'General'}</p>`;
    html += `<p><strong>Necesita reposición:</strong> ${item.needs ? 'Sí' : 'No'}</p>`;
    if (item.image) {
      html += `<img src="${item.image}" style="max-width:100%;height:auto;margin-bottom:0.5rem;border:1px solid var(--secondary);border-radius:4px;"/>`;
    }
    modal.innerHTML = html;
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Cerrar';
    closeBtn.className = 'cancel-btn';
    closeBtn.addEventListener('click', closeModal);
    actions.appendChild(closeBtn);
    modal.appendChild(actions);
    modalContainer.appendChild(modal);
    overlay.style.display = 'block';
    modalContainer.style.display = 'block';
  }

  // ========== Tools ==========
  const toolsTableBody = document.querySelector('#toolsTable tbody');
  const addToolBtn = document.getElementById('addToolBtn');
  function getTools() { return getStorage('tools', []); }
  function saveTools(arr) { setStorage('tools', arr); }
  function renderTools() {
    const user = getCurrentUser();
    const arr = getTools();
    toolsTableBody.innerHTML = '';
    if (user && user.role === 'admin') {
      addToolBtn.style.display = 'inline-block';
    } else {
      addToolBtn.style.display = 'none';
    }
    arr.forEach(item => {
      const tr = document.createElement('tr');
      // miniatura
      const imgHTML = item.image ? `<img src="${item.image}" class="tool-thumb"/>` : '';
      const isAdmin = user && user.role === 'admin';
      // Generar etiqueta de estado con clase
      const state = item.state || 'buena';
      const stateLabel = state === 'buena' ? 'Buenas' : state === 'media' ? 'Media' : state === 'mala' ? 'Mala' : 'En reparación';
      const stateClass = 'tool-status-' + state;
      const stateHtml = `<span class="${stateClass}">${stateLabel}</span>`;
      let actionsHtml = '';
      if (isAdmin) {
        actionsHtml = `<button class="primary-btn btn-sm" data-id="${item.id}">Editar</button>`;
      }
      tr.innerHTML = `
        <td>${imgHTML}${item.name}</td>
        <td>${item.code}</td>
        <td>${item.qty}</td>
        <td>${stateHtml}</td>
        <td>${actionsHtml}</td>
      `;
      if (isAdmin) {
        const btn = tr.querySelector('button');
        btn.addEventListener('click', e => {
          e.stopPropagation();
          openToolModal(item.id);
        });
      }
      tr.addEventListener('click', () => {
        if (!(user && user.role === 'admin')) {
          viewToolModal(item.id);
        }
      });
      toolsTableBody.appendChild(tr);
    });
    if (!arr.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.textContent = 'No hay herramientas.';
      tr.appendChild(td);
      toolsTableBody.appendChild(tr);
    }
  }
  addToolBtn.addEventListener('click', () => openToolModal(null));
  function openToolModal(id) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') return;
    const arr = getTools();
    const isNew = id == null;
    const tool = isNew ? null : arr.find(x => x.id === id);
    modalContainer.innerHTML = '';
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    modal.innerHTML = `
      <form id="toolForm">
        <h3>${isNew ? 'Agregar herramienta' : 'Editar herramienta'}</h3>
        <input type="hidden" id="toolId" value="${isNew ? '' : tool.id}">
        <label for="toolName">Nombre</label>
        <input type="text" id="toolName" required value="${isNew ? '' : tool.name}">
        <label for="toolCode">Código</label>
        <input type="text" id="toolCode" required value="${isNew ? '' : tool.code}">
        <label for="toolQty">Cantidad</label>
        <input type="number" id="toolQty" value="${isNew ? '' : tool.qty}">
        <label for="toolDesc">Descripción</label>
        <textarea id="toolDesc" rows="2">${isNew ? '' : tool.description || ''}</textarea>
        <label for="toolState">Estado</label>
        <select id="toolState">
          <option value="buena">Buenas condiciones</option>
          <option value="media">Medio</option>
          <option value="mala">Mala condición</option>
          <option value="reparacion">En reparación</option>
        </select>
        <label for="toolImage">Imagen</label>
        <input type="file" id="toolImage" accept="image/*">
        <div class="modal-actions">
          <button type="button" id="cancelTool" class="cancel-btn">Cancelar</button>
          <button type="submit" class="save-btn">${isNew ? 'Guardar' : 'Actualizar'}</button>
        </div>
      </form>
    `;
    modalContainer.appendChild(modal);
    overlay.style.display = 'block';
    modalContainer.style.display = 'block';
    // Preseleccionar el estado para herramientas existentes
    if (!isNew && tool && tool.state) {
      const stateSelect = modal.querySelector('#toolState');
      if (stateSelect) stateSelect.value = tool.state;
    }
    modal.querySelector('#cancelTool').addEventListener('click', closeModal);
    modal.querySelector('#toolForm').addEventListener('submit', async e => {
      e.preventDefault();
      const newId = isNew ? getNextId(arr) : tool.id;
      let imgData = isNew ? null : tool.image || null;
      const fileInput = modal.querySelector('#toolImage');
      if (fileInput.files && fileInput.files[0]) {
        imgData = await fileToDataURL(fileInput.files[0]);
      }
      const newTool = {
        id: newId,
        name: modal.querySelector('#toolName').value.trim(),
        code: modal.querySelector('#toolCode').value.trim(),
        qty: modal.querySelector('#toolQty').value,
        description: modal.querySelector('#toolDesc').value.trim(),
        image: imgData,
        state: modal.querySelector('#toolState').value
      };
      if (isNew) arr.push(newTool);
      else {
        const idx = arr.findIndex(x => x.id === newId);
        if (idx >= 0) arr[idx] = newTool;
      }
      saveTools(arr);
      closeModal();
      renderTools();
    });
  }

  /**
   * Muestra un modal de solo lectura con información de una herramienta.
   * @param {number} id
   */
  function viewToolModal(id) {
    const tool = getTools().find(t => t.id === id);
    if (!tool) return;
    modalContainer.innerHTML = '';
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    let html = `<h3>Herramienta</h3>`;
    html += `<p><strong>Nombre:</strong> ${tool.name}</p>`;
    html += `<p><strong>Código:</strong> ${tool.code}</p>`;
    html += `<p><strong>Cantidad:</strong> ${tool.qty}</p>`;
    if (tool.description) html += `<p><strong>Descripción:</strong> ${tool.description}</p>`;
    // Estado de la herramienta
    const state = tool.state || 'buena';
    const stateLabel = state === 'buena' ? 'Buenas condiciones' : state === 'media' ? 'Medio' : state === 'mala' ? 'Mala condición' : 'En reparación';
    html += `<p><strong>Estado:</strong> ${stateLabel}</p>`;
    if (tool.image) html += `<img src="${tool.image}" style="max-width:100%;height:auto;margin-bottom:0.5rem;border:1px solid var(--secondary);border-radius:4px;"/>`;
    modal.innerHTML = html;
    // Botón cerrar
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Cerrar';
    closeBtn.className = 'cancel-btn';
    closeBtn.addEventListener('click', closeModal);
    actions.appendChild(closeBtn);
    modal.appendChild(actions);
    modalContainer.appendChild(modal);
    overlay.style.display = 'block';
    modalContainer.style.display = 'block';
  }

  // ========== Providers ==========
  const providersTableBody = document.querySelector('#providersTable tbody');
  const addProviderBtn = document.getElementById('addProviderBtn');
  function getProviders() { return getStorage('providers', []); }
  function saveProviders(arr) { setStorage('providers', arr); }
  function renderProviders() {
    const user = getCurrentUser();
    const arr = getProviders();
    providersTableBody.innerHTML = '';
    if (user && user.role === 'admin') {
      addProviderBtn.style.display = 'inline-block';
    } else {
      addProviderBtn.style.display = 'none';
    }
    arr.forEach(item => {
      const tr = document.createElement('tr');
      const isAdmin = user && user.role === 'admin';
      tr.innerHTML = `
        <td>${item.name}</td>
        <td>${item.area}</td>
        <td>${item.phone}</td>
        <td>${item.email}</td>
        <td>${isAdmin ? '<button class="primary-btn btn-sm" data-id="' + item.id + '">Editar</button>' : ''}</td>
      `;
      if (isAdmin) {
        const btn = tr.querySelector('button');
        btn.addEventListener('click', e => {
          e.stopPropagation();
          openProviderModal(item.id);
        });
      }
      tr.addEventListener('click', () => {
        if (!isAdmin) viewProviderModal(item.id);
      });
      providersTableBody.appendChild(tr);
    });
    if (!arr.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.textContent = 'No hay proveedores.';
      tr.appendChild(td);
      providersTableBody.appendChild(tr);
    }
  }
  addProviderBtn.addEventListener('click', () => openProviderModal(null));
  function openProviderModal(id) {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') return;
    const arr = getProviders();
    const isNew = id == null;
    const prov = isNew ? null : arr.find(x => x.id === id);
    modalContainer.innerHTML = '';
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    modal.innerHTML = `
      <form id="providerForm">
        <h3>${isNew ? 'Agregar proveedor' : 'Editar proveedor'}</h3>
        <input type="hidden" id="providerId" value="${isNew ? '' : prov.id}">
        <label for="providerName">Nombre</label>
        <input type="text" id="providerName" required value="${isNew ? '' : prov.name}">
        <label for="providerArea">Área</label>
        <input type="text" id="providerArea" value="${isNew ? '' : prov.area}">
        <label for="providerPhone">Teléfono</label>
        <input type="text" id="providerPhone" value="${isNew ? '' : prov.phone}">
        <label for="providerEmail">Email</label>
        <input type="email" id="providerEmail" value="${isNew ? '' : prov.email}">
        <div class="modal-actions">
          <button type="button" id="cancelProvider" class="cancel-btn">Cancelar</button>
          <button type="submit" class="save-btn">${isNew ? 'Guardar' : 'Actualizar'}</button>
        </div>
      </form>
    `;
    modalContainer.appendChild(modal);
    overlay.style.display = 'block';
    modalContainer.style.display = 'block';
    modal.querySelector('#cancelProvider').addEventListener('click', closeModal);
    modal.querySelector('#providerForm').addEventListener('submit', e => {
      e.preventDefault();
      const newId = isNew ? getNextId(arr) : prov.id;
      const newProv = {
        id: newId,
        name: modal.querySelector('#providerName').value.trim(),
        area: modal.querySelector('#providerArea').value.trim(),
        phone: modal.querySelector('#providerPhone').value.trim(),
        email: modal.querySelector('#providerEmail').value.trim()
      };
      if (isNew) arr.push(newProv);
      else {
        const idx = arr.findIndex(x => x.id === newId);
        if (idx >= 0) arr[idx] = newProv;
      }
      saveProviders(arr);
      closeModal();
      renderProviders();
    });
  }

  /**
   * Muestra un proveedor en modo lectura.
   * @param {number} id
   */
  function viewProviderModal(id) {
    const prov = getProviders().find(p => p.id === id);
    if (!prov) return;
    modalContainer.innerHTML = '';
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    let html = '<h3>Proveedor</h3>';
    html += `<p><strong>Nombre:</strong> ${prov.name}</p>`;
    html += `<p><strong>Área:</strong> ${prov.area}</p>`;
    html += `<p><strong>Teléfono:</strong> ${prov.phone}</p>`;
    html += `<p><strong>Email:</strong> ${prov.email}</p>`;
    modal.innerHTML = html;
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Cerrar';
    closeBtn.className = 'cancel-btn';
    closeBtn.addEventListener('click', closeModal);
    actions.appendChild(closeBtn);
    modal.appendChild(actions);
    modalContainer.appendChild(modal);
    overlay.style.display = 'block';
    modalContainer.style.display = 'block';
  }

  // ========== Templates (Plantillas) ==========
  const templatesListEl = document.getElementById('templatesList');
  const addTemplateBtn = document.getElementById('addTemplateBtn');
  function getTemplates() { return getStorage('templates', []); }
  function saveTemplates(arr) { setStorage('templates', arr); }
  function renderTemplates() {
    const user = getCurrentUser();
    const arr = getTemplates();
    templatesListEl.innerHTML = '';
    if (user && user.role === 'admin') {
      addTemplateBtn.style.display = 'inline-block';
    } else {
      addTemplateBtn.style.display = 'none';
    }
    arr.forEach(item => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = item.url;
      link.textContent = item.name;
      link.target = '_blank';
      li.appendChild(link);
      if (user && user.role === 'admin') {
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Eliminar';
        delBtn.className = 'delete-btn';
        delBtn.addEventListener('click', () => {
          if (confirm('¿Eliminar plantilla?')) {
            const arr2 = getTemplates();
            const idx = arr2.findIndex(x => x.id === item.id);
            if (idx >= 0) arr2.splice(idx,1);
            saveTemplates(arr2);
            renderTemplates();
          }
        });
        li.appendChild(delBtn);
      }
      templatesListEl.appendChild(li);
    });
    if (!arr.length) {
      const li = document.createElement('li');
      li.textContent = 'No hay plantillas.';
      templatesListEl.appendChild(li);
    }
  }
  addTemplateBtn.addEventListener('click', () => openTemplateModal());

  // ================= Configuración de usuarios =================
  const usersTableBody = document.querySelector('#usersTable tbody');
  const addUserBtn = document.getElementById('addUserBtn');

  /**
   * Renderiza la tabla de usuarios combinando los usuarios por defecto y los personalizados.
   * Sólo los administradores pueden ver la sección y eliminar usuarios personalizados.
   */
  function renderUsers() {
    const current = getCurrentUser();
    if (!current || current.role !== 'admin') {
      // Si no es admin, limpiar y ocultar
      usersTableBody.innerHTML = '';
      if (addUserBtn) addUserBtn.style.display = 'none';
      return;
    }
    usersTableBody.innerHTML = '';
    const all = getAllUsers();
    all.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.name}</td>
        <td>${u.username}</td>
        <td>${u.role}</td>
        <td>${u.plant || ''}</td>
        <td></td>
      `;
      const actionsTd = tr.querySelector('td:last-child');
      // Botón de editar para cualquier usuario
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Editar';
      editBtn.className = 'primary-btn btn-sm';
      editBtn.addEventListener('click', () => {
        openUserEditModal(u);
      });
      actionsTd.appendChild(editBtn);
      // Botón de eliminar: el administrador puede eliminar cualquier usuario excepto a sí mismo.
      if (u.username !== current.username) {
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Eliminar';
        delBtn.className = 'danger-btn btn-sm';
        delBtn.style.marginLeft = '4px';
        delBtn.addEventListener('click', () => {
          if (confirm('¿Eliminar este usuario?')) {
            deleteUser(u);
            renderUsers();
          }
        });
        actionsTd.appendChild(delBtn);
      }
      usersTableBody.appendChild(tr);
    });
    // Mostrar botón de agregar usuario
    if (addUserBtn) {
      addUserBtn.style.display = 'inline-block';
    }
  }

  // Listener para agregar usuario
  if (addUserBtn) {
    addUserBtn.addEventListener('click', () => openUserModal());
  }

  /**
   * Muestra un mensaje de bienvenida al iniciar sesión con una imagen y texto.
   * @param {string} name Nombre del usuario para personalizar el saludo
   */
  function showWelcomeModal(name) {
    // Crear modal de bienvenida
    modalContainer.innerHTML = '';
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    modal.style.maxWidth = '600px';
    modal.innerHTML = `
      <h2 style="text-align:center;margin-top:0">Bienvenido</h2>
      <img src="static/images/welcome.jpg" alt="Bienvenida" style="width:100%;height:auto;border-radius:8px;margin-bottom:1rem;" />
      <p style="font-size:1.1rem;margin:0.5rem 0;text-align:center;">¡Bienvenido a la plataforma de mantenimiento!</p>
      <p style="font-size:0.9rem;margin:0.5rem 0;text-align:center;">Esta herramienta ha sido creada para optimizar la gestión de tareas, facilitar el seguimiento de incidencias y agilizar la resolución de urgencias.<br>Recuerda mantener actualizada la información y registrar cualquier falla o requerimiento para garantizar una operación eficiente en todas las sedes.</p>
      <p style="font-size:1rem;text-align:center;margin-top:1rem;">Atentamente.<br>La Máquina.</p>
      <p style="font-size:0.9rem;text-align:center;margin-bottom:1rem;">mantenimiento@bairescatering.com</p>
      <div class="modal-actions" style="text-align:center;">
        <button class="primary-btn" id="welcomeCloseBtn">Continuar</button>
      </div>
    `;
    modalContainer.appendChild(modal);
    overlay.style.display = 'block';
    modalContainer.style.display = 'block';
    // Cerrar al hacer clic en botón
    modal.querySelector('#welcomeCloseBtn').addEventListener('click', () => {
      closeModal();
    });
  }

  /**
   * Muestra el modal para crear un nuevo usuario personalizado.
   * Sólo accesible para administradores.
   */
  function openUserModal() {
    const current = getCurrentUser();
    if (!current || current.role !== 'admin') return;
    modalContainer.innerHTML = '';
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    modal.innerHTML = `
      <form id="userForm">
        <h3>Agregar usuario</h3>
        <label for="newUsername">Usuario</label>
        <input type="text" id="newUsername" required>
        <label for="newPassword">Contraseña</label>
        <input type="password" id="newPassword" required>
        <label for="newName">Nombre</label>
        <input type="text" id="newName" required>
        <label for="newRole">Rol</label>
        <select id="newRole">
          <option value="viewer">Visor</option>
          <option value="manager">Encargado</option>
          <option value="admin">Administrador</option>
        </select>
        <label for="newPlant">Planta (si aplica)</label>
        <select id="newPlant">
          <option value="">-- Ninguna --</option>
          <option value="San Martin">Planta San Martín</option>
          <option value="Versalles">Planta Versalles</option>
        </select>
        <div class="modal-actions">
          <button type="button" class="cancel-btn" id="cancelUserBtn">Cancelar</button>
          <button type="submit" class="save-btn">Guardar</button>
        </div>
      </form>
    `;
    modalContainer.appendChild(modal);
    overlay.style.display = 'block';
    modalContainer.style.display = 'block';
    const form = modal.querySelector('#userForm');
    modal.querySelector('#cancelUserBtn').addEventListener('click', closeModal);
    form.addEventListener('submit', e => {
      e.preventDefault();
      const username = form.querySelector('#newUsername').value.trim();
      if (!username) return;
      // Verificar si existe el usuario
      const exists = getAllUsers().some(u => u.username === username);
      if (exists) {
        alert('Ya existe un usuario con ese nombre');
        return;
      }
      const custom = getCustomUsers();
      custom.push({
        username: username,
        password: form.querySelector('#newPassword').value,
        name: form.querySelector('#newName').value,
        role: form.querySelector('#newRole').value,
        plant: form.querySelector('#newPlant').value
      });
      saveCustomUsers(custom);
      closeModal();
      renderUsers();
    });
  }

  /**
   * Muestra el modal para editar un usuario existente. Sólo los usuarios
   * personalizados se pueden modificar completamente; los usuarios
   * predeterminados solo permiten cambiar nombre, rol y planta, pero no
   * usuario ni contraseña.
   * @param {Object} u
   */
  function openUserEditModal(u) {
    const current = getCurrentUser();
    if (!current || current.role !== 'admin') return;
    modalContainer.innerHTML = '';
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    const isDefault = defaultUsers.some(d => d.username === u.username);
    modal.innerHTML = `
      <form id="userEditForm">
        <h3>Editar usuario</h3>
        <label for="editUsername">Usuario</label>
        <input type="text" id="editUsername" required value="${u.username}" ${isDefault ? 'disabled' : ''}>
        <label for="editPassword">Contraseña</label>
        <input type="password" id="editPassword" value="${isDefault ? '' : u.password}" ${isDefault ? 'disabled' : ''}>
        <label for="editName">Nombre</label>
        <input type="text" id="editName" required value="${u.name}">
        <label for="editRole">Rol</label>
        <select id="editRole">
          <option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>Visor</option>
          <option value="manager" ${u.role === 'manager' ? 'selected' : ''}>Encargado</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Administrador</option>
        </select>
        <label for="editPlant">Planta (si aplica)</label>
        <select id="editPlant">
          <option value="" ${!u.plant ? 'selected' : ''}>-- Ninguna --</option>
          <option value="San Martin" ${u.plant === 'San Martin' ? 'selected' : ''}>Planta San Martín</option>
          <option value="Versalles" ${u.plant === 'Versalles' ? 'selected' : ''}>Planta Versalles</option>
        </select>
        <div class="modal-actions">
          <button type="button" class="cancel-btn" id="cancelUserEdit">Cancelar</button>
          <button type="submit" class="save-btn">Actualizar</button>
        </div>
      </form>
    `;
    modalContainer.appendChild(modal);
    overlay.style.display = 'block';
    modalContainer.style.display = 'block';
    modal.querySelector('#cancelUserEdit').addEventListener('click', closeModal);
    modal.querySelector('#userEditForm').addEventListener('submit', e => {
      e.preventDefault();
      const custom = getCustomUsers();
      // Si el usuario es predeterminado, no se puede cambiar el nombre de usuario ni contraseña. Creamos o actualizamos un registro personalizado con overrides.
      if (isDefault) {
        // Buscar override
        let override = custom.find(x => x.username === u.username);
        if (!override) {
          override = { username: u.username };
          custom.push(override);
        }
        override.name = modal.querySelector('#editName').value;
        override.role = modal.querySelector('#editRole').value;
        override.plant = modal.querySelector('#editPlant').value;
        // No actualizar contraseña ni username
      } else {
        // Usuario personalizado: actualizar campos completos
        const idx = custom.findIndex(x => x.username === u.username);
        if (idx >= 0) {
          custom[idx] = {
            username: modal.querySelector('#editUsername').value.trim(),
            password: modal.querySelector('#editPassword').value,
            name: modal.querySelector('#editName').value,
            role: modal.querySelector('#editRole').value,
            plant: modal.querySelector('#editPlant').value
          };
        }
      }
      saveCustomUsers(custom);
      closeModal();
      renderUsers();
    });
  }
  function openTemplateModal() {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') return;
    modalContainer.innerHTML = '';
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    modal.innerHTML = `
      <form id="templateForm">
        <h3>Agregar plantilla</h3>
        <label for="templateName">Nombre</label>
        <input type="text" id="templateName" required>
        <label for="templateFile">Archivo</label>
        <input type="file" id="templateFile" required>
        <div class="modal-actions">
          <button type="button" id="cancelTemplate" class="cancel-btn">Cancelar</button>
          <button type="submit" class="save-btn">Guardar</button>
        </div>
      </form>
    `;
    modalContainer.appendChild(modal);
    overlay.style.display = 'block';
    modalContainer.style.display = 'block';
    modal.querySelector('#cancelTemplate').addEventListener('click', closeModal);
    modal.querySelector('#templateForm').addEventListener('submit', async e => {
      e.preventDefault();
      const arr = getTemplates();
      const fileInput = modal.querySelector('#templateFile');
      const name = modal.querySelector('#templateName').value.trim();
      if (!fileInput.files || !fileInput.files[0]) return;
      const file = fileInput.files[0];
      // Convert file to data URL to allow download later
      const url = await fileToDataURL(file);
      const newItem = {
        id: getNextId(arr),
        name,
        url
      };
      arr.push(newItem);
      saveTemplates(arr);
      closeModal();
      renderTemplates();
    });
  }

  // ========== Login modal ==========
  function showLoginModal() {
    modalContainer.innerHTML = '';
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    modal.innerHTML = `
      <form id="loginForm">
        <h3>Iniciar sesión</h3>
        <label for="loginUsername">Usuario</label>
        <input type="text" id="loginUsername" required>
        <label for="loginPassword">Contraseña</label>
        <input type="password" id="loginPassword" required>
        <div id="loginError" class="error-msg" style="display:none;color:var(--danger);">Usuario o contraseña incorrectos</div>
        <div class="modal-actions">
          <button type="button" id="cancelLogin" class="cancel-btn">Cancelar</button>
          <button type="submit" class="save-btn">Entrar</button>
        </div>
      </form>
    `;
    modalContainer.appendChild(modal);
    overlay.style.display = 'block';
    modalContainer.style.display = 'block';
    const form = modal.querySelector('#loginForm');
    modal.querySelector('#cancelLogin').addEventListener('click', closeModal);
    form.addEventListener('submit', e => {
      e.preventDefault();
      const u = form.querySelector('#loginUsername').value.trim();
      const p = form.querySelector('#loginPassword').value.trim();
      // Buscar en la lista combinada de usuarios (por defecto + personalizados)
      const found = getAllUsers().find(x => x.username === u && x.password === p);
      if (found) {
        setCurrentUser({ username: found.username, role: found.role, plant: found.plant, name: found.name });
        closeModal();
        // Mostrar mensaje de bienvenida con imagen
        showWelcomeModal(found.name);
        initApp();
      } else {
        form.querySelector('#loginError').style.display = 'block';
      }
    });
  }

  /**
   * Inicializa la aplicación (renderiza controles, calendarios, etc.).
   */
  function initApp() {
    renderUserControls();
    initNavigation();
    renderCalendar();
    renderRequests();
    renderBudgets();
    renderMachines();
    // Asignar listener al filtro por planta de máquinas
    const plantFilter = document.getElementById('machinePlantFilter');
    if (plantFilter) {
      plantFilter.addEventListener('change', () => {
        renderMachines();
      });
    }
    renderSpareParts();
    renderTools();
    renderProviders();
    renderTemplates();
    // Muestra sección por defecto
    showSection(SECTION_IDS.calendar);
  }

  // Cerrar modal al hacer clic en overlay
  overlay.addEventListener('click', closeModal);

  // Cargar aplicación
  document.addEventListener('DOMContentLoaded', () => {
    const user = getCurrentUser();
    renderUserControls();
    initNavigation();
    // Mostrar calendario aunque no haya login
    renderCalendar();
    if (user) {
      initApp();
    }
  });
})();