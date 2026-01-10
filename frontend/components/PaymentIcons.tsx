export function PaymentIcons() {
    return (
        <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-foreground/70">Secure Payment:</span>
            <div className="flex items-center gap-2">
                {/* Visa */}
                <div className="w-12 h-8 bg-white rounded border border-border flex items-center justify-center">
                    <svg viewBox="0 0 48 32" className="w-10 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="48" height="32" fill="white" />
                        <path d="M18.5 11L15.5 21H13L11 13.5C10.9 13.1 10.7 12.8 10.4 12.6C9.7 12.2 8.7 11.8 7.5 11.5L7.6 11H11.8C12.4 11 12.9 11.4 13 12L13.9 17.5L16.3 11H18.5ZM27.5 17.3C27.5 19.3 25.7 20.4 24.3 21C22.9 21.6 22.3 22 22.3 22.6C22.3 23.5 23.3 24 24.4 24C25.8 24 26.6 23.8 27.7 23.3L28.1 25.1C27.3 25.4 26.1 25.7 24.7 25.7C22.2 25.7 20.4 24.4 20.4 22.4C20.4 20.9 21.8 19.8 23.7 19C25.6 18.2 26.2 17.7 26.2 16.9C26.2 15.8 24.9 15.3 23.7 15.3C22.3 15.3 21.4 15.5 20.3 16L19.9 14.2C20.9 13.8 22.2 13.4 23.8 13.4C26.6 13.4 27.5 14.8 27.5 17.3ZM34 21H36L34.3 11H32.5C32 11 31.6 11.3 31.4 11.7L27.5 21H29.7L30.2 19.7H32.8L33.1 21ZM30.8 18L32.1 14.5L32.8 18H30.8ZM24 11L22.2 21H20.2L22 11H24Z" fill="#1434CB" />
                    </svg>
                </div>

                {/* Mastercard */}
                <div className="w-12 h-8 bg-white rounded border border-border flex items-center justify-center">
                    <svg viewBox="0 0 48 32" className="w-10 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="48" height="32" fill="white" />
                        <circle cx="18" cy="16" r="7" fill="#EB001B" />
                        <circle cx="30" cy="16" r="7" fill="#F79E1B" />
                        <path d="M24 11.5C25.5 12.7 26.5 14.5 26.5 16.5C26.5 18.5 25.5 20.3 24 21.5C22.5 20.3 21.5 18.5 21.5 16.5C21.5 14.5 22.5 12.7 24 11.5Z" fill="#FF5F00" />
                    </svg>
                </div>

                {/* Paystack */}
                <div className="w-12 h-8 bg-[#00C3F7] rounded border border-border flex items-center justify-center">
                    <svg viewBox="0 0 48 32" className="w-10 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="48" height="32" fill="#00C3F7" />
                        <path d="M20 10H22V22H20V10ZM24 10H26V22H24V10ZM28 10H30V22H28V10Z" fill="white" />
                    </svg>
                </div>

                {/* Stripe */}
                <div className="w-12 h-8 bg-[#635BFF] rounded border border-border flex items-center justify-center">
                    <svg viewBox="0 0 48 32" className="w-10 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="48" height="32" fill="#635BFF" />
                        <path d="M24 14C22.5 14 21.5 14.5 21.5 15.5C21.5 16.3 22.1 16.7 23.5 17.2C26 18 27 18.8 27 20.5C27 22.5 25.3 23.5 23 23.5C21.5 23.5 20 23.1 19 22.5V20.3C20.1 21 21.5 21.5 23 21.5C24.5 21.5 25.3 21 25.3 20C25.3 19.2 24.7 18.7 23.2 18.2C20.8 17.4 20 16.7 20 15C20 13.2 21.5 12 24 12C25.3 12 26.5 12.3 27.5 12.8V15C26.5 14.4 25.3 14 24 14Z" fill="white" />
                    </svg>
                </div>

                {/* Apple Pay */}
                <div className="w-12 h-8 bg-black rounded border border-border flex items-center justify-center">
                    <svg viewBox="0 0 48 32" className="w-10 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="48" height="32" fill="black" />
                        <path d="M17 13.5C17 12.5 17.7 11.7 18.8 11.5C18.6 11.3 18.3 11.1 18 11C17.2 10.7 16.3 11 15.8 11.6C15.3 12.2 15 13 15 13.8C15 15.5 16.2 17 17.5 17C18 17 18.4 16.8 18.7 16.5C19 16.2 19.2 15.8 19.2 15.3C19.2 14.3 18.3 13.5 17 13.5ZM22 13H24V17H22V13ZM26 13H27.5C28.3 13 29 13.7 29 14.5V15.5C29 16.3 28.3 17 27.5 17H26V13ZM27 15.5V14.5H27.5V15.5H27Z" fill="white" />
                    </svg>
                </div>

                {/* Google Pay */}
                <div className="w-12 h-8 bg-white rounded border border-border flex items-center justify-center">
                    <svg viewBox="0 0 48 32" className="w-10 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="48" height="32" fill="white" />
                        <path d="M22 16V18H25.5C25.4 18.8 24.7 20 23 20C21.5 20 20.2 18.7 20.2 17C20.2 15.3 21.5 14 23 14C23.9 14 24.5 14.4 24.9 14.7L26.3 13.4C25.5 12.6 24.4 12 23 12C20.2 12 18 14.2 18 17C18 19.8 20.2 22 23 22C25.9 22 27.5 20 27.5 17.2C27.5 16.8 27.5 16.5 27.4 16.2H22V16Z" fill="#4285F4" />
                        <path d="M30 13H32V21H30V13Z" fill="#EA4335" />
                        <path d="M34 16C34 14.2 35.3 12 37.5 12C38.5 12 39.2 12.4 39.7 12.9L38.5 14.1C38.2 13.8 37.9 13.6 37.5 13.6C36.5 13.6 35.7 14.5 35.7 15.5C35.7 16.5 36.5 17.4 37.5 17.4C37.9 17.4 38.2 17.2 38.5 16.9L39.7 18.1C39.2 18.6 38.5 19 37.5 19C35.3 19 34 16.8 34 15Z" fill="#FBBC04" />
                    </svg>
                </div>
            </div>
        </div>
    );
}
