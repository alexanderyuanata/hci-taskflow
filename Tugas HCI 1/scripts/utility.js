function showMessageModal(message) {
  document.getElementById("modalMessage").textContent = message;

  const modal = new bootstrap.Modal(document.getElementById("messageModal"));
  modal.show();
}

export {showMessageModal};