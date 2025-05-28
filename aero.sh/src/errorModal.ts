/**
 * Shared utility for creating Material 3 error dialogs
 */

// Material Web Components for dialog
import "@material/web/dialog/dialog.js";
import "@material/web/button/text-button.js";

/** Configuration for error modal */
export interface ErrorModalConfig {
	/** Dialog title/headline */
	title: string;
	/** Error message content */
	message: string;
	/** Button text (defaults to "OK") */
	buttonText?: string;
	/** Callback when dialog is closed */
	onClose?: () => void;
}

/**
 * Shows a Material 3 error dialog with the specified configuration
 * @param config - Configuration for the error dialog
 */
export function showErrorModal(config: ErrorModalConfig): void {
	const { title, message, buttonText = "OK", onClose } = config;

	const dialog = document.createElement('md-dialog');
	dialog.setAttribute('type', 'alert');
	dialog.innerHTML = `
		<div slot="headline">${title}</div>
		<div slot="content">
			${message}
		</div>
		<div slot="actions">
			<md-text-button autofocus onclick="this.closest('md-dialog').close()">
				${buttonText}
			</md-text-button>
		</div>
	`;

	document.body.appendChild(dialog);
	dialog.setAttribute('open', 'true');

	// Clean up after dialog closes
	dialog.addEventListener('close', () => {
		document.body.removeChild(dialog);
		if (onClose) {
			onClose();
		}
	});
} 