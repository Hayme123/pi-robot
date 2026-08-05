"use strict";

const dealerData = Array.from({ length: 21 }, (_, index) => ({
  id: index + 1,
  number: "1",
  alias: "482-FL",
  business: "482-Aco-miami Beach Coral Gables",
  contact: "Jane Doe",
  age: "0 month(s)",
  licenses: ["0", "0", "0", "0"],
  hosts: ["0", "0", "0"],
  advertisers: ["0", "0"],
  status: "36 MB/s",
}));

let visibleRows = 10;
let searchTerm = "";
let selectedRows = new Set();

function actionButtons(row) {
  return `
    <span class="row-actions">
      <button class="row-action unlock-action" type="button" data-action="lock" data-id="${row.id}" aria-label="Unlock ${row.alias}" aria-pressed="false">
        <svg class="unlock-icon" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M4.2 6V4.5a2.8 2.8 0 0 1 5.2-1.45"></path>
          <rect x="2.1" y="6" width="9.8" height="6.5" rx="1.2"></rect>
        </svg>
      </button>
      <button class="row-action delete-action" type="button" data-action="delete" data-id="${row.id}" aria-label="Delete ${row.alias}">
        <span class="icon trash" aria-hidden="true"></span>
      </button>
      <button class="row-action more-action" type="button" data-action="more" data-id="${row.id}" aria-label="More actions for ${row.alias}" aria-pressed="false">
        <span class="icon ellipsis" aria-hidden="true"></span>
      </button>
    </span>
  `;
}

function dealerRow(row) {
  const checked = selectedRows.has(row.id) ? " checked" : "";
  return `
    <tr data-id="${row.id}">
      <td class="status-indicator"></td>
      <td class="checkbox-cell"><input class="row-select" type="checkbox" data-id="${row.id}" aria-label="Select ${row.alias}"${checked}></td>
      <td>${row.number}</td>
      <td>${row.alias}</td>
      <td>${row.business}</td>
      <td>${row.contact}</td>
      <td>${row.age}</td>
      ${row.licenses.map((value) => `<td class="metric-cell">${value}</td>`).join("")}
      ${row.hosts.map((value) => `<td class="metric-cell">${value}</td>`).join("")}
      ${row.advertisers.map((value) => `<td class="metric-cell">${value}</td>`).join("")}
      <td class="status-cell"><span class="speed-tag">${row.status}</span></td>
      <td class="action-cell">${actionButtons(row)}</td>
    </tr>
  `;
}

function filteredDealers() {
  const normalized = searchTerm.trim().toLowerCase();
  if (!normalized) return dealerData;
  return dealerData.filter((row) =>
    [row.alias, row.business, row.contact, row.age, row.status].some((value) =>
      value.toLowerCase().includes(normalized),
    ),
  );
}

function renderDealerRows() {
  const body = document.querySelector("#dealer-rows");
  if (!body) return;

  const matches = filteredDealers();
  const displayed = matches.slice(0, visibleRows);
  body.innerHTML = displayed.map(dealerRow).join("");

  const itemCount = document.querySelector("#item-count");
  if (itemCount)
    itemCount.textContent = `Showing ${displayed.length} of 100 items`;

  const showMore = document.querySelector("#show-more");
  if (showMore) showMore.hidden = matches.length <= visibleRows;

  bindRowEvents();
  updateSelectionControls();
}

function bindRowEvents() {
  document.querySelectorAll(".row-select").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const id = Number(checkbox.dataset.id);
      if (checkbox.checked) selectedRows.add(id);
      else selectedRows.delete(id);
      updateSelectionControls();
    });
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      const action = button.dataset.action;
      if (action === "delete") {
        const index = dealerData.findIndex((row) => row.id === id);
        if (index >= 0) dealerData.splice(index, 1);
        selectedRows.delete(id);
        renderDealerRows();
      } else if (action === "lock") {
        const pressed = button.getAttribute("aria-pressed") === "true";
        button.setAttribute("aria-pressed", String(!pressed));
      } else if (action === "more") {
        const row = button.closest("tr");
        const pressed = button.getAttribute("aria-pressed") === "true";
        button.setAttribute("aria-pressed", String(!pressed));
        row?.classList.toggle("is-marked", !pressed);
      }
    });
  });
}

function updateSelectionControls() {
  const displayedCheckboxes = Array.from(
    document.querySelectorAll(".row-select"),
  );
  const selectedDisplayed = displayedCheckboxes.filter(
    (checkbox) => checkbox.checked,
  ).length;
  const selectAll = document.querySelector("#select-all");
  if (selectAll) {
    selectAll.checked =
      displayedCheckboxes.length > 0 &&
      selectedDisplayed === displayedCheckboxes.length;
    selectAll.indeterminate =
      selectedDisplayed > 0 && selectedDisplayed < displayedCheckboxes.length;
  }

  const bulkDelete = document.querySelector("#bulk-delete");
  if (bulkDelete) bulkDelete.disabled = selectedRows.size === 0;
}

function formatDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "";
  return `${shortMonths[month - 1]} ${day}, ${year}`;
}

function updateDateRangeLabel() {
  const startDate = document.querySelector("#start-date");
  const endDate = document.querySelector("#end-date");
  const button = document.querySelector("#date-range-button");
  if (startDate && endDate && button) {
    button.textContent = `${formatDate(startDate.value)} - ${formatDate(endDate.value)}`;
  }
}

function openDatePicker(input) {
  if (!input) return;
  try {
    if (typeof input.showPicker === "function") input.showPicker();
    else input.focus();
  } catch {
    input.focus();
  }
}

function exportDealers() {
  const headings = [
    "#",
    "Dealer Alias",
    "Business Name",
    "Contact Person",
    "Age",
    "Licenses Total",
    "Licenses Unassigned",
    "Licenses Online",
    "Licenses Offline",
    "Hosts Total",
    "Hosts Schedule",
    "Hosts Active",
    "Advertisers Total",
    "Advertisers Active",
    "Status",
  ];
  const rows = filteredDealers().map((row) => [
    row.number,
    row.alias,
    row.business,
    row.contact,
    row.age,
    ...row.licenses,
    ...row.hosts,
    ...row.advertisers,
    row.status,
  ]);
  const csv = [headings, ...rows]
    .map((row) =>
      row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "dealer-data.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function bindPageInteractions() {
  document.querySelectorAll(".dropdown-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      document
        .querySelectorAll(".dropdown-toggle[aria-expanded='true']")
        .forEach((openButton) => {
          if (openButton !== button)
            openButton.setAttribute("aria-expanded", "false");
        });
      button.setAttribute("aria-expanded", String(!expanded));
    });
  });

  const analyticsToggle = document.querySelector("#analytics-toggle");
  const analytics = document.querySelector("#analytics");
  analyticsToggle?.addEventListener("click", () => {
    const expanded = analyticsToggle.getAttribute("aria-expanded") === "true";
    analyticsToggle.setAttribute("aria-expanded", String(!expanded));
    analytics?.classList.toggle("is-hidden", expanded);
    analytics?.closest(".dashboard-section")?.classList.toggle("analytics-hidden", expanded);
  });

  const dealerSearch = document.querySelector("#dealer-search");
  dealerSearch?.addEventListener("input", () => {
    searchTerm = dealerSearch.value;
    visibleRows = 10;
    renderDealerRows();
  });

  const globalSearch = document.querySelector("#global-search");
  globalSearch?.addEventListener("input", () => {
    if (dealerSearch) dealerSearch.value = globalSearch.value;
    searchTerm = globalSearch.value;
    visibleRows = 10;
    renderDealerRows();
  });

  document.querySelector("#select-all")?.addEventListener("change", (event) => {
    document.querySelectorAll(".row-select").forEach((checkbox) => {
      checkbox.checked = event.currentTarget.checked;
      const id = Number(checkbox.dataset.id);
      if (checkbox.checked) selectedRows.add(id);
      else selectedRows.delete(id);
    });
    updateSelectionControls();
  });

  document.querySelectorAll(".header-filter").forEach((button) => {
    button.addEventListener("click", () => {
      const descending = button.dataset.direction === "descending";
      const direction = descending ? "ascending" : "descending";
      document.querySelectorAll(".header-filter").forEach((otherButton) => {
        otherButton.dataset.direction = "";
        otherButton.closest("th")?.removeAttribute("aria-sort");
      });
      button.dataset.direction = direction;
      button.closest("th")?.setAttribute("aria-sort", direction);
      const multiplier = direction === "ascending" ? 1 : -1;
      dealerData.sort(
        (first, second) =>
          first[button.dataset.sort].localeCompare(
            second[button.dataset.sort],
          ) * multiplier,
      );
      renderDealerRows();
    });
  });

  document.querySelector("#bulk-delete")?.addEventListener("click", () => {
    for (let index = dealerData.length - 1; index >= 0; index -= 1) {
      if (selectedRows.has(dealerData[index].id)) dealerData.splice(index, 1);
    }
    selectedRows = new Set();
    renderDealerRows();
  });

  document.querySelector("#show-more")?.addEventListener("click", () => {
    visibleRows = Math.min(visibleRows + 10, dealerData.length);
    renderDealerRows();
  });

  document
    .querySelector("#export-button")
    ?.addEventListener("click", exportDealers);

  const tableSettings = document.querySelector("#table-settings");
  const tableCard = document.querySelector(".table-card");
  tableSettings?.addEventListener("click", () => {
    const pressed = tableSettings.getAttribute("aria-pressed") === "true";
    tableSettings.setAttribute("aria-pressed", String(!pressed));
    tableCard?.classList.toggle("compact", !pressed);
  });

  const dateButton = document.querySelector("#date-range-button");
  const startDate = document.querySelector("#start-date");
  const endDate = document.querySelector("#end-date");
  dateButton?.addEventListener("click", () => openDatePicker(startDate));
  startDate?.addEventListener("change", () => {
    updateDateRangeLabel();
    openDatePicker(endDate);
  });
  endDate?.addEventListener("change", updateDateRangeLabel);

  const themeButton = document.querySelector(".theme-button");
  themeButton?.addEventListener("click", () => {
    const pressed = themeButton.getAttribute("aria-pressed") === "true";
    themeButton.setAttribute("aria-pressed", String(!pressed));
  });
}

renderDealerRows();
bindPageInteractions();
