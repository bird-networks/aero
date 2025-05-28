/**
 * Badge components for Aero footer
 * Contains GitHubBadge, DiscordBadge, and FooterBadges
 */

// Material Web Components for dialog
import "@material/web/dialog/dialog.js";
import "@material/web/button/text-button.js";

// Import iframe utilities
import { openInAeroIframe } from "./iframeUtils.js";

/** GitHub logo badge component */
const GitHubBadge: Component<{}> = function () {
	return (
		<a
			href="https://github.com/browser-ports/aero"
			target="_blank"
			rel="noopener noreferrer"
			style="
				width: 48px;
				height: 48px;
				border-radius: 50%;
				background: var(--md-sys-color-primary-container);
				box-shadow: 0 2px 8px rgba(0,0,0,0.08);
				display: flex;
				align-items: center;
				justify-content: center;
				transition: box-shadow 0.2s, background 0.2s;
				text-decoration: none;
				border: 3px solid #fff;
				cursor: pointer;
			"
			aria-label="Aero on GitHub"
			onmouseover="this.style.boxShadow = '0 4px 16px rgba(0,0,0,0.16)'; this.style.background = 'var(--md-sys-color-primary-container)'; this.style.filter = 'brightness(1.05)';"
			onmouseout="this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; this.style.filter = 'none';"
		>
			<img
				style="
					width: 28px;
					height: 28px;
					display: block;
					object-fit: contain;
				"
				src="/imgs/badges/github-mark.svg"
				alt="GitHub Logo"
			/>
		</a>
	);
};

/** Discord logo badge component with proxy choice dialog */
const DiscordBadge: Component<
	{},
	{
		showProxyDialog: boolean;
	}
> = function () {
	this.showProxyDialog = false;

	const discordUrl = "https://discord.gg/browserports";

	const handleDiscordClick = (e: Event) => {
		e.preventDefault();
		this.showProxyDialog = true;
	};

	const openInProxy = async () => {
		this.showProxyDialog = false;
		console.debug("[Discord Badge] Opening URL in proxy:", discordUrl);
		await openInAeroIframe(discordUrl);
	};

	const openDirectly = () => {
		this.showProxyDialog = false;
		window.open(discordUrl, "_blank", "noopener,noreferrer");
	};

	const closeDialog = () => {
		this.showProxyDialog = false;
	};



	return (
		<div>
			<div
				style="
					width: 48px;
					height: 48px;
					border-radius: 50%;
					background: var(--md-sys-color-primary-container);
					box-shadow: 0 2px 8px rgba(0,0,0,0.08);
					display: flex;
					align-items: center;
					justify-content: center;
					transition: box-shadow 0.2s, background 0.2s;
					text-decoration: none;
					border: 3px solid #fff;
					cursor: pointer;
				"
				on:click={handleDiscordClick}
				aria-label="Join Aero Discord"
				role="button"
				tabindex="0"
				onmouseover="this.style.boxShadow = '0 4px 16px rgba(0,0,0,0.16)'; this.style.background = 'var(--md-sys-color-primary-container)'; this.style.filter = 'brightness(1.05)';"
				onmouseout="this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; this.style.filter = 'none';"
			>
				<img
					style="
						width: 28px;
						height: 28px;
						display: block;
						object-fit: contain;
					"
					src="/imgs/badges/Discord-Symbol-Black.svg"
					alt="Discord Logo"
				/>
			</div>

			{/* Proxy Choice Dialog */}
			<md-dialog 
				open={use(this.showProxyDialog)} 
				on:close={closeDialog}
			>
				<div slot="headline">Open Discord Link</div>
				<div slot="content">
					How would you like to open the Discord server link?
				</div>
				<div slot="actions">
					<md-text-button on:click={openDirectly}>
						Open directly
					</md-text-button>
					<md-text-button 
						on:click={openInProxy}
						autofocus
					>
						Open in proxy
					</md-text-button>
				</div>
			</md-dialog>
		</div>
	);
};

/** Footer badge row container */
export const FooterBadges: Component<{}> = function () {
	return (
		<div class="footer-links content-block">
			<GitHubBadge />
			<DiscordBadge />
		</div>
	);
};
