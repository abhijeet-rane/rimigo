declare module '@cashfreepayments/cashfree-js' {
    export interface CashfreeInstance {
        checkout(options: {
            paymentSessionId: string
            redirectTarget: '_self' | '_blank'
        }): void
    }

    export interface LoadOptions {
        mode: 'sandbox' | 'production'
    }

    export function load(options: LoadOptions): Promise<CashfreeInstance>
}

