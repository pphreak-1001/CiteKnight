let originalContent = "";

function getEditBox() {
  const textbox = document.getElementById("wpTextbox1");
  if (textbox) return textbox;

  const visualEditorDiv = document.querySelector('[contenteditable="true"]');
  if (visualEditorDiv) return visualEditorDiv;

  return null;
}

function getCurrentContent(editBox) {
  return editBox.tagName === "TEXTAREA" ? editBox.value : editBox.innerText;
}

function stripWikiMarkup(text) {
  return text
    .replace(/\[\[.*?\|(.*?)\]\]/g, "$1")
    .replace(/\[\[(.*?)\]\]/g, "$1")
    .replace(/\{\{.*?\}\}/gs, "")
    .replace(/'''''(.*?)'''''/g, "$1")
    .replace(/'''(.*?)'''/g, "$1")
    .replace(/''(.*?)''/g, "$1")
    .replace(/^==+.*?==+$/gm, "")
    .replace(/<ref[^>]*>.*?<\/ref>/gs, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function waitForEditorAndInitialize() {
  const interval = setInterval(() => {
    const editBox = getEditBox();
    if (editBox) {
      clearInterval(interval);
      originalContent = stripWikiMarkup(getCurrentContent(editBox));
      setupEditBoxWatcher(editBox);
      injectReviewButton();
    }
  }, 500);
}

function setupEditBoxWatcher(editBox) {
  const handler = () => {
    if (!originalContent) {
      originalContent = stripWikiMarkup(getCurrentContent(editBox));
    }
  };

  if (editBox.tagName === "TEXTAREA") {
    editBox.addEventListener("input", handler);
  } else {
    editBox.addEventListener("keyup", handler);
  }
}

function injectReviewButton() {
  const analyzeBtn = document.createElement("button");
  analyzeBtn.id = "copilot-review-btn";
  analyzeBtn.innerHTML = `
  <img src="${chrome.runtime.getURL('icons/icon128.png')}"style="width: 18px; height: 18px; vertical-align: middle; margin-right: 8px;"> Review with CiteKnight`;

  Object.assign(analyzeBtn.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "10000",
    padding: "10px 16px",
    backgroundColor: "#58CC02",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontWeight: "bold",
    boxShadow: "0 4px 6px rgba(0,0,0,0.2)",
    fontSize: "15px",
    cursor: "pointer",
    transition: "background-color 0.3s"
  });

  analyzeBtn.onmouseenter = () => (analyzeBtn.style.backgroundColor = "#4AA101");
  analyzeBtn.onmouseleave = () => (analyzeBtn.style.backgroundColor = "#58CC02");

  analyzeBtn.onclick = analyzeEdit;
  document.body.appendChild(analyzeBtn);
}

async function fetchSummaryAndTitle() {
  const pageTitle = new URL(window.location.href).searchParams.get("title");
  const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${pageTitle}`;

  try {
    const res = await fetch(apiUrl);
    const json = await res.json();

    return {
      title: json.title || pageTitle || "Untitled",
      summary: json.extract || "No summary found"
    };
  } catch (err) {
    console.warn("Failed to fetch title/summary:", err);
    return {
      title: pageTitle || "Untitled",
      summary: "No summary found"
    };
  }
}

function showGamifiedFeedback(feedbackList) {
  const existingPopup = document.getElementById("citeKnightPopup");
  if (existingPopup) existingPopup.remove();

  // Create audio element for click sound
  const audioElement = document.createElement("audio");
  audioElement.id = "citeKnightAudio";
  audioElement.src = chrome.runtime.getURL('audio/click.mp3');
  document.body.appendChild(audioElement);

  // Calculate points and badges
  let points = 0;
  let badges = [];

  feedbackList.forEach((item) => {
    if (item.toLowerCase().includes("citation")) {
      badges.push("📚 Citation Fixer");
      points += 10;
    } else if (item.toLowerCase().includes("bias")) {
      badges.push("⚖️ Neutral Editor");
      points += 10;
    } else {
      points += 5;
    }
  });

  // Update XP
  updateXP(points);

  // Create backdrop with blur effect
  const backdrop = document.createElement("div");
  Object.assign(backdrop.style, {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    backdropFilter: "blur(8px)",
    zIndex: 9999,
    opacity: 0,
    transition: "opacity 0.5s ease-out"
  });

  // Create container for the swipe UI - now full page
  const container = document.createElement("div");
  container.id = "citeKnightPopup";
  Object.assign(container.style, {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 10000,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    transform: "scale(0.8)",
    opacity: 0,
    transition: "transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.5s ease-out"
  });

  // Create card container
  const cardContainer = document.createElement("div");
  Object.assign(cardContainer.style, {
    position: "relative",
    width: "90%",
    maxWidth: "600px",
    zIndex: 10000
  });

  // Add backdrop and container to document
  document.body.appendChild(backdrop);
  document.body.appendChild(container);
  container.appendChild(cardContainer);

  // Animate in
  setTimeout(() => {
    backdrop.style.opacity = "1";
    container.style.transform = "scale(1)";
    container.style.opacity = "1";
  }, 10);

  // Track current card index
  let currentIndex = 0;
  let isShowingDetails = false;
  let autoRevealTimer = null;
  let autoAdvanceTimer = null;
  let touchStartX = 0;
  let touchEndX = 0;
  let cardElement = null;

  // Function to create a card
  function createCard(index) {
    if (index >= feedbackList.length) {
      showSummaryView();
      return;
    }

    // Clear any existing card
    if (cardElement) {
      cardElement.remove();
    }

    // Create new card
    cardElement = document.createElement("div");
    Object.assign(cardElement.style, {
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderRadius: "24px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
      padding: "32px",
      width: "100%",
      boxSizing: "border-box",
      transform: "translateX(0) scale(0.95)",
      transition: "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s ease-out",
      opacity: 0,
      position: "relative",
      overflow: "hidden",
      border: "3px solid #FF6B6B",
      animation: "pulse 2s infinite"
    });

    // Add keyframes for pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { box-shadow: 0 10px 30px rgba(255, 107, 107, 0.2); }
        50% { box-shadow: 0 10px 30px rgba(255, 107, 107, 0.4); }
        100% { box-shadow: 0 10px 30px rgba(255, 107, 107, 0.2); }
      }
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
      }
    `;
    document.head.appendChild(style);

    // Create title
    const title = document.createElement("h3");
    title.textContent = feedbackList[index];
    Object.assign(title.style, {
      margin: "0 0 24px 0",
      fontSize: "28px",
      fontWeight: "600",
      color: "#333",
      textAlign: "center",
      transform: "translateY(0)",
      transition: "transform 0.3s ease-out"
    });

    // Create close button
    const closeBtn = document.createElement("div");
    closeBtn.innerHTML = "❌";
    Object.assign(closeBtn.style, {
      position: "absolute",
      top: "24px",
      right: "24px",
      fontSize: "20px",
      cursor: "pointer",
      opacity: "0.7",
      transition: "opacity 0.2s, transform 0.2s"
    });
    closeBtn.onmouseover = () => {
      closeBtn.style.opacity = "1";
      closeBtn.style.transform = "scale(1.2) rotate(90deg)";
    };
    closeBtn.onmouseout = () => {
      closeBtn.style.opacity = "0.7";
      closeBtn.style.transform = "scale(1) rotate(0deg)";
    };
    closeBtn.onclick = () => {
      // Animate out
      backdrop.style.opacity = "0";
      container.style.transform = "scale(0.8)";
      container.style.opacity = "0";
      
      // Remove after animation completes
      setTimeout(() => {
        container.remove();
        backdrop.remove();
        audioElement.remove();
      }, 500);
    };

    // Create details section (initially hidden)
    const details = document.createElement("div");
    details.textContent = getFeedbackDetails(feedbackList[index]);
    Object.assign(details.style, {
      marginTop: "24px",
      fontSize: "18px",
      color: "#555",
      lineHeight: "1.6",
      maxHeight: "0",
      overflow: "hidden",
      transition: "max-height 0.5s ease-out, opacity 0.3s ease-out, transform 0.3s ease-out",
      opacity: 0,
      transform: "translateY(10px)"
    });

    // Create action buttons
    const buttonContainer = document.createElement("div");
    Object.assign(buttonContainer.style, {
      display: "flex",
      justifyContent: "space-between",
      marginTop: "32px"
    });

    // Understood button
    const understoodBtn = document.createElement("button");
    understoodBtn.innerHTML = "✅ Understood";
    Object.assign(understoodBtn.style, {
      padding: "14px 24px",
      backgroundColor: "#58CC02",
      color: "white",
      border: "none",
      borderRadius: "16px",
      fontWeight: "bold",
      fontSize: "18px",
      cursor: "pointer",
      transition: "background-color 0.2s, transform 0.2s, box-shadow 0.2s",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    });
    understoodBtn.onmouseover = () => {
      understoodBtn.style.backgroundColor = "#4AA101";
      understoodBtn.style.transform = "translateY(-2px)";
      understoodBtn.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
    };
    understoodBtn.onmouseout = () => {
      understoodBtn.style.backgroundColor = "#58CC02";
      understoodBtn.style.transform = "translateY(0)";
      understoodBtn.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
    };
    understoodBtn.onclick = () => {
      // Play sound effect
      if (audioElement) {
        audioElement.currentTime = 0; // Reset audio to start
        audioElement.play();
      }

      if (isShowingDetails) {
        // If details are showing, move to next card
        isShowingDetails = false;
        clearTimeout(autoAdvanceTimer);
        
        // Add good vibe animation
        understoodBtn.style.transform = "scale(1.1)";
        understoodBtn.style.animation = "bounce 0.5s";
        
        // Add confetti effect
        createConfetti();
        
        setTimeout(() => {
          understoodBtn.style.transform = "scale(1)";
          understoodBtn.style.animation = "";
          currentIndex++;
          createCard(currentIndex);
        }, 500);
      } else {
        // If only title is showing, move to next card directly
        currentIndex++;
        createCard(currentIndex);
      }
    };

    // Details button
    const detailsBtn = document.createElement("button");
    detailsBtn.innerHTML = "ℹ️ Details";
    Object.assign(detailsBtn.style, {
      padding: "14px 24px",
      backgroundColor: "#FF6B6B",
      color: "white",
      border: "none",
      borderRadius: "16px",
      fontWeight: "bold",
      fontSize: "18px",
      cursor: "pointer",
      transition: "background-color 0.2s, transform 0.2s, box-shadow 0.2s",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    });
    detailsBtn.onmouseover = () => {
      detailsBtn.style.backgroundColor = "#FF5252";
      detailsBtn.style.transform = "translateY(-2px)";
      detailsBtn.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
    };
    detailsBtn.onmouseout = () => {
      detailsBtn.style.backgroundColor = "#FF6B6B";
      detailsBtn.style.transform = "translateY(0)";
      detailsBtn.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
    };
    detailsBtn.onclick = () => {
      if (!isShowingDetails) {
        showDetails();
      }
    };

    // Add buttons to container
    buttonContainer.appendChild(understoodBtn);
    buttonContainer.appendChild(detailsBtn);

    // Add elements to card
    cardElement.appendChild(closeBtn);
    cardElement.appendChild(title);
    cardElement.appendChild(details);
    cardElement.appendChild(buttonContainer);

    // Add card to container
    cardContainer.appendChild(cardElement);
    
    // Animate in the card
    setTimeout(() => {
      cardElement.style.opacity = "1";
      cardElement.style.transform = "translateX(0) scale(1)";
    }, 10);

    // Set up swipe handlers
    setupSwipeHandlers(cardElement);
  }

  // Function to create confetti effect
  function createConfetti() {
    const confettiContainer = document.createElement('div');
    confettiContainer.style.position = 'absolute';
    confettiContainer.style.top = '0';
    confettiContainer.style.left = '0';
    confettiContainer.style.width = '100%';
    confettiContainer.style.height = '100%';
    confettiContainer.style.pointerEvents = 'none';
    confettiContainer.style.zIndex = '10001';
    
    cardContainer.appendChild(confettiContainer);
    
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#58CC02', '#FF9F1C'];
    
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      const size = Math.random() * 15 + 5;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      Object.assign(confetti.style, {
        position: 'absolute',
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '0',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        opacity: '0',
        transition: 'all 0.5s ease-out'
      });
      
      confettiContainer.appendChild(confetti);
      
      // Animate confetti
      setTimeout(() => {
        const angle = Math.random() * 360;
        const distance = Math.random() * 200 + 100;
        const x = Math.cos(angle * Math.PI / 180) * distance;
        const y = Math.sin(angle * Math.PI / 180) * distance;
        
        confetti.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${Math.random() * 360}deg)`;
        confetti.style.opacity = '1';
      }, 10);
      
      // Remove confetti after animation
      setTimeout(() => {
        confetti.style.opacity = '0';
        setTimeout(() => {
          confetti.remove();
          if (confettiContainer.children.length === 0) {
            confettiContainer.remove();
          }
        }, 500);
      }, 1000);
    }
  }

  // Function to show details
  function showDetails() {
    isShowingDetails = true;
    const details = cardElement.querySelector("div:nth-child(3)");
    details.style.maxHeight = "300px";
    details.style.opacity = "1";
    details.style.transform = "translateY(0)";
    
    // Animate title
    const title = cardElement.querySelector("h3");
    title.style.transform = "translateY(-5px)";
    setTimeout(() => {
      title.style.transform = "translateY(0)";
    }, 300);

    // Set auto-advance timer
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = setTimeout(() => {
      currentIndex++;
      createCard(currentIndex);
    }, 5000);
  }

  // Function to set up swipe handlers
  function setupSwipeHandlers(element) {
    element.addEventListener("touchstart", (e) => {
      touchStartX = e.touches[0].clientX;
    }, false);

    element.addEventListener("touchmove", (e) => {
      touchEndX = e.touches[0].clientX;
      const diffX = touchEndX - touchStartX;
      
      // Limit swipe to reasonable range
      if (Math.abs(diffX) < 100) {
        element.style.transform = `translateX(${diffX}px) scale(1)`;
      }
    }, false);

    element.addEventListener("touchend", () => {
      const diffX = touchEndX - touchStartX;
      
      // Reset position
      element.style.transform = "translateX(0) scale(1)";
      
      // Handle swipe - FIXED DIRECTIONS
      if (diffX > 100) {
        // Swipe right - show details
        if (!isShowingDetails) {
          showDetails();
        }
      } else if (diffX < -100) {
        // Swipe left - understood
        if (isShowingDetails) {
          currentIndex++;
          createCard(currentIndex);
        } else {
          showDetails();
        }
      }
    }, false);

    // Mouse events for desktop
    element.addEventListener("mousedown", (e) => {
      touchStartX = e.clientX;
    }, false);

    element.addEventListener("mousemove", (e) => {
      if (e.buttons === 1) { // Left mouse button is pressed
        touchEndX = e.clientX;
        const diffX = touchEndX - touchStartX;
        
        // Limit swipe to reasonable range
        if (Math.abs(diffX) < 100) {
          element.style.transform = `translateX(${diffX}px) scale(1)`;
        }
      }
    }, false);

    element.addEventListener("mouseup", () => {
      const diffX = touchEndX - touchStartX;
      
      // Reset position
      element.style.transform = "translateX(0) scale(1)";
      
      // Handle swipe - FIXED DIRECTIONS
      if (diffX > 100) {
        // Swipe right - show details
        if (!isShowingDetails) {
          showDetails();
        }
      } else if (diffX < -100) {
        // Swipe left - understood
        if (isShowingDetails) {
          currentIndex++;
          createCard(currentIndex);
        } else {
          showDetails();
        }
      }
    }, false);
  }

  // Function to get feedback details based on feedback type
  function getFeedbackDetails(feedback) {
    const lowerFeedback = feedback.toLowerCase();
    
    if (lowerFeedback.includes("citation")) {
      return "Your edit may need citations to support claims. Consider adding references to reliable sources to improve credibility.";
    } else if (lowerFeedback.includes("bias")) {
      return "Your edit may contain biased language. Wikipedia requires a neutral point of view. Consider rephrasing to be more objective.";
    } else if (lowerFeedback.includes("grammar")) {
      return "Your edit contains grammatical errors. Consider reviewing for proper spelling, punctuation, and sentence structure.";
    } else if (lowerFeedback.includes("clarity")) {
      return "Your edit could be clearer. Consider simplifying complex sentences and using more precise language.";
    } else {
      return "This feedback suggests an area for improvement in your Wikipedia edit. Consider reviewing the content for accuracy and adherence to Wikipedia guidelines.";
    }
  }

  // Function to show summary view
  function showSummaryView() {
    // Clear any existing card
    if (cardElement) {
      cardElement.remove();
    }

    // Create summary card
    cardElement = document.createElement("div");
    Object.assign(cardElement.style, {
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderRadius: "24px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
      padding: "32px",
      width: "100%",
      boxSizing: "border-box",
      textAlign: "center",
      border: "3px solid #4ECDC4",
      opacity: 0,
      transform: "scale(0.95)",
      transition: "opacity 0.4s ease-out, transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      animation: "pulse 2s infinite"
    });

    // Create title
    const title = document.createElement("h3");
    title.textContent = "🎉 Review Complete!";
    Object.assign(title.style, {
      margin: "0 0 24px 0",
      fontSize: "32px",
      fontWeight: "600",
      color: "#333",
      animation: "bounce 2s infinite"
    });

    // Create close button
    const closeBtn = document.createElement("div");
    closeBtn.innerHTML = "❌";
    Object.assign(closeBtn.style, {
      position: "absolute",
      top: "24px",
      right: "24px",
      fontSize: "20px",
      cursor: "pointer",
      opacity: "0.7",
      transition: "opacity 0.2s, transform 0.2s"
    });
    closeBtn.onmouseover = () => {
      closeBtn.style.opacity = "1";
      closeBtn.style.transform = "scale(1.2) rotate(90deg)";
    };
    closeBtn.onmouseout = () => {
      closeBtn.style.opacity = "0.7";
      closeBtn.style.transform = "scale(1) rotate(0deg)";
    };
    closeBtn.onclick = () => {
      // Animate out
      backdrop.style.opacity = "0";
      container.style.transform = "scale(0.8)";
      container.style.opacity = "0";
      
      // Remove after animation completes
      setTimeout(() => {
        container.remove();
        backdrop.remove();
        audioElement.remove();
      }, 500);
    };

    // Create points display
    const pointsDisplay = document.createElement("div");
    pointsDisplay.innerHTML = `<strong>🏅 Points Earned:</strong> ${points}`;
    Object.assign(pointsDisplay.style, {
      fontSize: "24px",
      marginBottom: "24px",
      color: "#333",
      transform: "translateY(0)",
      transition: "transform 0.3s ease-out"
    });
    pointsDisplay.onmouseover = () => pointsDisplay.style.transform = "translateY(-3px)";
    pointsDisplay.onmouseout = () => pointsDisplay.style.transform = "translateY(0)";

    // Create badges display
    const badgeDisplay = document.createElement("div");
    badgeDisplay.innerHTML = `<strong>🎖️ Badges:</strong> ${[...new Set(badges)].map(b => `<span style="font-size: 24px; margin-right:10px; display: inline-block; animation: bounce 2s infinite; animation-delay: ${Math.random() * 2}s;">${b}</span>`).join("") || "None"}`;
    Object.assign(badgeDisplay.style, {
      fontSize: "24px",
      marginBottom: "24px",
      color: "#333",
      transform: "translateY(0)",
      transition: "transform 0.3s ease-out"
    });
    badgeDisplay.onmouseover = () => badgeDisplay.style.transform = "translateY(-3px)";
    badgeDisplay.onmouseout = () => badgeDisplay.style.transform = "translateY(0)";

    // Create XP display
    const xpDisplay = document.createElement("div");
    xpDisplay.innerHTML = `<strong>🌱 Total XP:</strong> ${localStorage.getItem("citeKnightXP") || 0}`;
    Object.assign(xpDisplay.style, {
      fontSize: "24px",
      marginBottom: "32px",
      color: "#333",
      transform: "translateY(0)",
      transition: "transform 0.3s ease-out"
    });
    xpDisplay.onmouseover = () => xpDisplay.style.transform = "translateY(-3px)";
    xpDisplay.onmouseout = () => xpDisplay.style.transform = "translateY(0)";

    // Create close button
    const doneBtn = document.createElement("button");
    doneBtn.textContent = "Done";
    Object.assign(doneBtn.style, {
      padding: "16px 32px",
      backgroundColor: "#4ECDC4",
      color: "white",
      border: "none",
      borderRadius: "16px",
      fontWeight: "bold",
      fontSize: "20px",
      cursor: "pointer",
      transition: "background-color 0.2s, transform 0.2s, box-shadow 0.2s",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    });
    doneBtn.onmouseover = () => {
      doneBtn.style.backgroundColor = "#3DBEB6";
      doneBtn.style.transform = "translateY(-2px)";
      doneBtn.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
    };
    doneBtn.onmouseout = () => {
      doneBtn.style.backgroundColor = "#4ECDC4";
      doneBtn.style.transform = "translateY(0)";
      doneBtn.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
    };
    doneBtn.onclick = () => {
      // Animate out
      backdrop.style.opacity = "0";
      container.style.transform = "scale(0.8)";
      container.style.opacity = "0";
      
      // Remove after animation completes
      setTimeout(() => {
        container.remove();
        backdrop.remove();
        audioElement.remove();
      }, 500);
    };

    // Add elements to card
    cardElement.appendChild(closeBtn);
    cardElement.appendChild(title);
    cardElement.appendChild(pointsDisplay);
    cardElement.appendChild(badgeDisplay);
    cardElement.appendChild(xpDisplay);
    cardElement.appendChild(doneBtn);

    // Add card to container
    cardContainer.appendChild(cardElement);
    
    // Animate in the card
    setTimeout(() => {
      cardElement.style.opacity = "1";
      cardElement.style.transform = "scale(1)";
    }, 10);
    
    // Create confetti for summary view
    createConfetti();
  }

  // Start with the first card
  createCard(currentIndex);
}

function updateXP(points) {
  const currentXP = parseInt(localStorage.getItem("citeKnightXP") || "0", 10);
  const newXP = currentXP + points;
  localStorage.setItem("citeKnightXP", newXP);
}

async function analyzeEdit() {
  const editBox = getEditBox();
  const analyzeBtn = document.getElementById("copilot-review-btn");

  if (!editBox) {
    return alert("No editable content area found.");
  }

  const currentContent = stripWikiMarkup(getCurrentContent(editBox));
  if (!currentContent.trim()) {
    return alert("No content found in the editor box.");
  }

  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(originalContent, currentContent);
  dmp.diff_cleanupSemantic(diffs);
  const patchList = dmp.patch_make(originalContent, diffs);
  const patchText = dmp.patch_toText(patchList);

  if (!patchText.trim()) {
    alert("✅ No changes detected to review.");
    return;
  }

  if (patchText.length > 10000) {
    alert("⚠️ The changes are too large to analyze at once. Please reduce or split your edits.");
    return;
  }

  if (analyzeBtn) {
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "⏳ Analyzing...";
  }

  try {
    const { title, summary } = await fetchSummaryAndTitle();

    const response = await fetch("http://localhost:9999/analyzeEdit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, summary, patch: patchText })
    });

    const data = await response.json();
    console.log("🧠 CiteKnight Feedback:", data.feedback);
    showGamifiedFeedback(data.feedback);
  } catch (err) {
    console.error("❌ AnalyzeEdit fetch failed:", err);
    alert("❌ Failed to get feedback from CiteKnight.");
  } finally {
    if (analyzeBtn) {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = `<img src="${chrome.runtime.getURL('icons/icon128.png')}" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 6px;">
  Review with CiteKnight`;
    }
  }
}

window.addEventListener("load", () => {
  if (typeof diff_match_patch === "undefined") {
    alert("diff_match_patch not loaded.");
    return;
  }
  waitForEditorAndInitialize();
});
