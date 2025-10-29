declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            // Optional flags we actually use in the app
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            use_fedcm_for_prompt?: boolean;
            itp_support?: boolean;
            ux_mode?: "popup" | "redirect";
            select_by?: "auto" | "btn" | "user";
            prompt_parent_id?: string;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options?: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              width?: string | number;
              logo_alignment?: "left" | "center";
              locale?: string;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export {};
