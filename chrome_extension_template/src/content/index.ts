export default window.onload = () => {
  // Check if we're on an ORCID profile page
  if (!window.location.hostname.includes('orcid.org')) {
    return;
  }

  // Create a Works Manager tab/button
  const managerButton = document.createElement("button");
  managerButton.id = "orcid-works-manager-btn";
  managerButton.textContent = "Works Manager";
  managerButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: #a6ce39;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 12px 20px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    z-index: 10000;
  `;

  managerButton.addEventListener("mouseenter", () => {
    managerButton.style.backgroundColor = "#8fb82d";
  });

  managerButton.addEventListener("mouseleave", () => {
    managerButton.style.backgroundColor = "#a6ce39";
  });

  managerButton.addEventListener("click", () => {
    // Open the side panel or popup
    chrome.runtime.sendMessage({ action: "openWorksManager" });
  });

  document.body.appendChild(managerButton);
};
