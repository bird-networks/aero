import type { APIInterceptor } from "$types/apiInterceptors";

// Delete for now
export default [
	{
		skip: true,
		globalProp: "PaymentRequest",
	},
	{
		skip: true,
		globalProp: "MerchantValidationEvent",
	},
] as APIInterceptor[];
