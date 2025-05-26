/**
 * @module
 * You can find this module on `aero-sandbox/proxy-parse-js/keywordProcessorHandler` on *NPM* or *JSR*
 */

import type {
	BlockDepthRefPassthrough,
	EnteredNewStatementRefPassthrough,
	InitHandlersRefPassthrough,
	KeywordGenConfig,
	processKeywordHandlerType,
	TrackerConfig,
	TrackPropertyChainRefPassthrough,
} from "./index.js";
import { createHandleEscapeChars, processStatement, StringSpecificHandlers } from "./internal/handlers";
import { createBlockDepthCounter } from "./internal/counters";
import { createPropertyChainTracker, createProxyApplyTracker } from "./internal/trackers";

/**
 * I recommend declaring `/*@__INLINE__*\/` on your handler and any helper modules to your handler
 */
export default function processKeywordHandler(script: string, config: {
	keywordGenConfig: KeywordGenConfig;
	trackers: TrackerConfig;
}, handler: processKeywordHandlerType): void {
	/** Is the character the first character in a new statement? (e.g. `;` or `}` or `(`) */
	const enteredNewStatementRefPassthrough: EnteredNewStatementRefPassthrough = {
		enteredNewStatement: true,
	};

	const blockDepthRefPassthrough: Partial<BlockDepthRefPassthrough> = {};
	if (
		config.trackers.blockDepth ||
		// This system requires trackPropertyChain, so might as well include it
		config.trackers.propertyChain
	) {
		blockDepthRefPassthrough.blockDepth = 0;
	}

	const trackPropertyChainRefPassthrough: Partial<
		TrackPropertyChainRefPassthrough
	> = {};
	if (config.trackers.propertyChain) {
		trackPropertyChainRefPassthrough.currentChain = "";
		trackPropertyChainRefPassthrough.inPropertyChain = false;
		trackPropertyChainRefPassthrough.propertyChainEnded = false;
	}

	// Init handlers
	const initHandlersRefPassthrough: InitHandlersRefPassthrough = {
		inString: false,
		inTemplateLiteral: false,
		inRegex: false,
	};

	const handleEscapeChars = createHandleEscapeChars();
	const stringSpecificHandlers = new StringSpecificHandlers(
		initHandlersRefPassthrough,
		config.keywordGenConfig.supportStrings,
		config.keywordGenConfig.supportTemplateLiterals,
	);

	// Init counters
	/** A counter for the current depth into blocks */
	const blockDepthCounter = createBlockDepthCounter(
		blockDepthRefPassthrough,
	);

	// Init trackers
	/** Track the property chain */
	const propertyChainTracker = createPropertyChainTracker(
		blockDepthRefPassthrough,
		trackPropertyChainRefPassthrough,
	);
	/** Track the apply handler in the `Proxy` object */
	const proxyApplyTracker = createProxyApplyTracker();

	// Tracker accumulation
	/// Property Chain Tracker
	let currentChain: string = "";
	let inPropertyChain: boolean = false;
	let propertyChainEnded: boolean = false;
	/// Apply Tracker
	let inProxyTrackingHandler: boolean = false;
	let inProxy: boolean = false;
	let inApply: boolean = false;
	let inApplyBody: boolean = false;
	let enteringApplyBody: boolean = false;
	let exitingProxyHandler: boolean = false;

	for (let i = 0; i < script.length; i++) {
		const char = script[i];

		// Handle escape character, string literals, template literals, and handle RegEx
		if (
			!(handleEscapeChars(char) || stringSpecificHandlers.stringLiteral(char) ||
				stringSpecificHandlers.templateLiteral(char) ||
				stringSpecificHandlers.regEx(char))
		) {
			// Resetting the "current" tracker accumulation vars because they don't reflect the current state in this iteration (what just happened);
			let propertyChainEnded = false;
			let enteringApplyBody: boolean = false;
			let exitingProxyHandler: boolean = false;

			// Track block depth
			blockDepthCounter(char);

			// Check for new line or semicolon to start a new statement
			if (
				!processStatement(
					char,
					enteredNewStatementRefPassthrough,
				)
			) {
				// We are no longer in a new statemnet
				if (enteredNewStatementRefPassthrough.enteredNewStatement) {
					enteredNewStatementRefPassthrough.enteredNewStatement = false;
				}

				/** Did this character end the property chain? */
				if (config.trackers.propertyChain) {
					const propertyChainData = propertyChainTracker(char);

					if (propertyChainData) {
						currentChain = propertyChainData.currentChain || "";
						inPropertyChain = propertyChainData.inPropertyChain || false;
						propertyChainEnded = propertyChainData.propertyChainEnded || false;
					}
				} else if (config.trackers.proxyApply) {
					const applyData = proxyApplyTracker(char) as any;
					if (applyData) {
						inProxyTrackingHandler = applyData.inProxyTrackingHandler || false; // Is it tracking the handler object?
						inProxy = applyData.inProxy || false;
						inApply = applyData.inApply || false;
						inApplyBody = applyData.inApplyBody || false;
						enteringApplyBody = applyData.enteringApplyBody || false; // Is it just now entering the apply body?
						exitingProxyHandler = applyData.exitingProxyHandler || false;
					}
				}
			}
		}

		handler(i, char, {
			currentChain,
			inPropertyChain,
			propertyChainEnded,
			inProxyTrackingHandler,
			inProxy,
			inApply,
			inApplyBody,
			enteringApplyBody,
			exitingProxyHandler,
		});
	}
}
