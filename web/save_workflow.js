// ComfyUI-Tricks1: Save Workflow Functionality
console.log("Save Workflow Extension Loading");

// Wait for app to be available
function waitForApp(callback) {
    if (window.app) {
        callback(window.app);
    } else {
        setTimeout(() => waitForApp(callback), 500);
    }
}

waitForApp((app) => {
    // Store original menu function
    const originalMenu = LGraphCanvas.prototype.getCanvasMenuOptions;

    // Add our custom menu option
    LGraphCanvas.prototype.getCanvasMenuOptions = function() {
        const options = originalMenu.call(this);
        
        options.push(null); // separator
        options.push({
            content: "💾 Save workflow as...",
            callback: () => {
                try {
                    const workflowData = app.graph.serialize();
                    const workflowJSON = JSON.stringify(workflowData, null, 2);
                    const blob = new Blob([workflowJSON], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "workflow.json";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    console.log("Workflow saved successfully");
                } catch (error) {
                    console.error("Error saving workflow:", error);
                    alert("Error saving workflow: " + error.message);
                }
            }
        });
        
        return options;
    };
    
    console.log("Save Workflow Extension Menu Added");
});