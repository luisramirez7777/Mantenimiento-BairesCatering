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
  const users = [
    { username: 'encargado1_sanmartin', password: 'sanmartin1', role: 'manager', plant: 'San Martin', name: 'Encargado 1 San Martín' },
    { username: 'encargado1_versalles', password: 'versalles1', role: 'manager', plant: 'Versalles', name: 'Encargado 1 Versalles' },
    { username: 'encargado2_versalles', password: 'versalles2', role: 'manager', plant: 'Versalles', name: 'Encargado 2 Versalles' },
    { username: 'soledad', password: 'admin1', role: 'admin', plant: '', name: 'Soledad' },
    { username: 'luis', password: 'admin2', role: 'admin', plant: '', name: 'Luis' },
    { username: 'usuario1', password: 'user1', role: 'viewer', plant: '', name: 'Usuario 1' }
  ];

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
  };

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
    } else {
      const loginBtn = document.createElement('button');
      loginBtn.textContent = 'Iniciar sesión';
      loginBtn.addEventListener('click', showLoginModal);
      userControlsEl.appendChild(loginBtn);
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
        el.textContent = task.title;
        el.dataset.id = task.id;
        if (user && user.role !== 'viewer') {
          el.addEventListener('click', e => {
            e.stopPropagation();
            openTaskModal(task.id);
          });
        }
        tasksEl.appendChild(el);
      });
      cell.appendChild(tasksEl);
      if (user && user.role !== 'viewer' && !cell.classList.contains('inactive')) {
        cell.addEventListener('click', () => openTaskModal(null, dateStr));
      }
      calendarEl.appendChild(cell);
    }
    // Toggle add button
    if (user && user.role !== 'viewer') {
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
    if (!user) return;
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
      <label for="taskPlant">Planta</label>
      <select id="taskPlant" required ${user.role === 'manager' ? 'disabled' : ''}>
        <option value="San Martin" ${(!isNew && task.plant === 'San Martin') || (isNew && user.plant === 'San Martin') ? 'selected' : ''}>Planta San Martín</option>
        <option value="Versalles" ${(!isNew && task.plant === 'Versalles') || (isNew && user.plant === 'Versalles') ? 'selected' : ''}>Planta Versalles</option>
      </select>
      <label for="taskMachine">Máquina</label>
      <select id="taskMachine">
        <option value="">-- Ninguna --</option>
      </select>
      <label for="taskDate">Fecha y hora</label>
      <input type="datetime-local" id="taskDate" required>
      <label for="taskTechnician">Encargado/Responsable</label>
      <input type="text" id="taskTechnician" value="${!isNew ? (task.technician || '') : ''}">
      <label for="taskStatus">Estado</label>
      <select id="taskStatus" ${user.role === 'manager' ? '' : ''}>
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
    // Rellenar select de máquinas
    const machineSelect = form.querySelector('#taskMachine');
    const machines = getStorage('machines', []);
    machines.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      if (!isNew && task.machineId === m.id) opt.selected = true;
      machineSelect.appendChild(opt);
    });
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
      const newTask = {
        id: idVal,
        title: form.querySelector('#taskTitle').value.trim(),
        plant: user.role === 'manager' ? user.plant : form.querySelector('#taskPlant').value,
        machineId: form.querySelector('#taskMachine').value ? parseInt(form.querySelector('#taskMachine').value, 10) : null,
        start: form.querySelector('#taskDate').value,
        end: form.querySelector('#taskDate').value,
        status: form.querySelector('#taskStatus').value,
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
    const machines = getMachines();
    machinesListEl.innerHTML = '';
    if (user && user.role !== 'viewer') {
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
    const container = document.createElement('div');
    if (machine.image) {
      const img = document.createElement('img');
      img.src = machine.image;
      container.appendChild(img);
    }
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
    container.appendChild(grid);
    // Show maintenance tasks for this machine
    const title = document.createElement('h4');
    title.textContent = 'Mantenimientos relacionados';
    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = '<thead><tr><th>Fecha</th><th>Título</th><th>Estado</th><th>Responsable</th></tr></thead><tbody></tbody>';
    const tbody = table.querySelector('tbody');
    const tasks = getTasks().filter(t => t.machineId === machine.id);
    tasks.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${t.start.slice(0,10)}</td><td>${t.title}</td><td>${t.status}</td><td>${t.technician || ''}</td>`;
      tbody.appendChild(tr);
    });
    if (tasks.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.textContent = 'No hay mantenimientos.';
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
    machineDetailsEl.appendChild(container);
    machineDetailsEl.appendChild(title);
    machineDetailsEl.appendChild(table);
    // Admin controls
    const user = getCurrentUser();
    if (user && user.role === 'admin') {
      const actions = document.createElement('div');
      actions.style.marginTop = '0.5rem';
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

  // ============== Secciones restantes (simplificadas) ==============
  // Requests (solicitudes)
  const requestsTableBody = document.querySelector('#requestsTable tbody');
  const addRequestBtn = document.getElementById('addRequestBtn');
  function getRequests() { return getStorage('requests', []); }
  function saveRequests(arr) { setStorage('requests', arr); }
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
      tr.innerHTML = `
        <td>${req.title}</td>
        <td>${req.date.slice(0,10)}</td>
        <td>${getMachineName(req.machineId)}</td>
        <td>${req.urgent ? 'Sí' : 'No'}</td>
        <td>${req.status}</td>
        <td><button class="primary-btn btn-sm" data-id="${req.id}">Ver</button></td>
      `;
      const btn = tr.querySelector('button');
      btn.addEventListener('click', () => openRequestModal(req.id));
      requestsTableBody.appendChild(tr);
    });
    if (!requests.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
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
        <label for="requestDate">Fecha</label>
        <input type="datetime-local" id="requestDate" required value="${isNew ? new Date().toISOString().slice(0,16) : req.date}">
        <label for="requestMachine">Máquina</label>
        <select id="requestMachine">
          <option value="">-- Ninguna --</option>
        </select>
        <label for="requestUrgent">Urgente</label>
        <select id="requestUrgent">
          <option value="false" ${isNew || !req.urgent ? 'selected' : ''}>No</option>
          <option value="true" ${!isNew && req.urgent ? 'selected' : ''}>Sí</option>
        </select>
        <label for="requestDesc">Descripción</label>
        <textarea id="requestDesc" rows="3">${isNew ? '' : req.description || ''}</textarea>
        <label for="requestStatus">Estado</label>
        <select id="requestStatus" ${user.role === 'viewer' || (user.role === 'manager' && !isNew) ? 'disabled' : ''}>
          <option value="pendiente">Pendiente</option>
          <option value="en revisión">En revisión</option>
          <option value="aprobada">Aprobada</option>
          <option value="rechazada">Rechazada</option>
        </select>
        <div class="modal-actions">
          <button type="button" id="cancelRequest" class="cancel-btn">Cancelar</button>
          <button type="submit" class="save-btn">${isNew ? 'Guardar' : 'Actualizar'}</button>
        </div>
      </form>
    `;
    modalContainer.appendChild(modal);
    overlay.style.display = 'block';
    modalContainer.style.display = 'block';
    // Fill machine select
    const machineSel = modal.querySelector('#requestMachine');
    getMachines().forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      if (!isNew && req.machineId === m.id) opt.selected = true;
      machineSel.appendChild(opt);
    });
    // Fill status
    const statusSel = modal.querySelector('#requestStatus');
    if (!isNew) statusSel.value = req.status;
    // Cancel
    modal.querySelector('#cancelRequest').addEventListener('click', closeModal);
    // Submit
    modal.querySelector('#requestForm').addEventListener('submit', e => {
      e.preventDefault();
      const arr = getRequests();
      const rId = isNew ? getNextId(arr) : req.id;
      const newReq = {
        id: rId,
        title: modal.querySelector('#requestTitle').value.trim(),
        date: modal.querySelector('#requestDate').value,
        machineId: modal.querySelector('#requestMachine').value ? parseInt(modal.querySelector('#requestMachine').value,10) : null,
        urgent: modal.querySelector('#requestUrgent').value === 'true',
        description: modal.querySelector('#requestDesc').value.trim(),
        status: user.role === 'admin' ? modal.querySelector('#requestStatus').value : (isNew ? 'pendiente' : req.status),
        createdBy: user.username
      };
      if (isNew) arr.push(newReq);
      else {
        const idx = arr.findIndex(r => r.id === rId);
        if (idx >= 0) arr[idx] = newReq;
      }
      saveRequests(arr);
      closeModal();
      renderRequests();
    });
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
      tr.innerHTML = `
        <td>${b.title}</td>
        <td>${b.date.slice(0,10)}</td>
        <td>${b.amount || ''}</td>
        <td>${b.status}</td>
        <td><button class="primary-btn btn-sm" data-id="${b.id}">Ver</button></td>
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
      const newBudget = {
        id: newId,
        title: modal.querySelector('#budgetTitle').value.trim(),
        date: modal.querySelector('#budgetDate').value,
        amount: modal.querySelector('#budgetAmount').value,
        status: modal.querySelector('#budgetStatus').value,
        description: modal.querySelector('#budgetDesc').value.trim()
      };
      if (isNew) arr.push(newBudget);
      else {
        const idx = arr.findIndex(x => x.id === newId);
        if (idx >= 0) arr[idx] = newBudget;
      }
      saveBudgets(arr);
      closeModal();
      renderBudgets();
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
      tr.innerHTML = `
        <td>${item.name}</td>
        <td>${item.code}</td>
        <td>${item.qty}</td>
        <td>${getMachineName(item.machineId)}</td>
        <td><button class="primary-btn btn-sm" data-id="${item.id}">Ver</button></td>
      `;
      const btn = tr.querySelector('button');
      btn.addEventListener('click', () => openSparePartModal(item.id));
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
    modal.querySelector('#spareForm').addEventListener('submit', e => {
      e.preventDefault();
      const newId = isNew ? getNextId(arr) : sp.id;
      const newSp = {
        id: newId,
        name: modal.querySelector('#spareName').value.trim(),
        code: modal.querySelector('#spareCode').value.trim(),
        qty: modal.querySelector('#spareQty').value,
        machineId: modal.querySelector('#spareMachine').value ? parseInt(modal.querySelector('#spareMachine').value,10) : null,
        needs: modal.querySelector('#spareNeeds').value === 'true'
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
      tr.innerHTML = `
        <td>${item.name}</td>
        <td>${item.code}</td>
        <td>${item.qty}</td>
        <td><button class="primary-btn btn-sm" data-id="${item.id}">Ver</button></td>
      `;
      const btn = tr.querySelector('button');
      btn.addEventListener('click', () => openToolModal(item.id));
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
        image: imgData
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
      tr.innerHTML = `
        <td>${item.name}</td>
        <td>${item.area}</td>
        <td>${item.phone}</td>
        <td>${item.email}</td>
        <td><button class="primary-btn btn-sm" data-id="${item.id}">Ver</button></td>
      `;
      const btn = tr.querySelector('button');
      btn.addEventListener('click', () => openProviderModal(item.id));
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
      const found = users.find(x => x.username === u && x.password === p);
      if (found) {
        setCurrentUser({ username: found.username, role: found.role, plant: found.plant, name: found.name });
        closeModal();
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