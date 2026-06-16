import { z } from "zod";

const regex = {
    cyberCafeName: /^[\p{L}0-9\s'-]{2,100}$/u,
    siret: /^\d{14}$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.#_-])[A-Za-z\d@$!%*?&.#_-]{8,}$/,
    managerName: /^[\p{L}\s'-]{2,80}$/u
};

const optionalText = (schema) => z.preprocess(
    (value) => value === "" ? undefined : value,
    schema.optional()
);

const managerSchema = z.object({
    cyberCafeName: z
        .string()
        .trim()
        .regex(regex.cyberCafeName, "Le nom du cybercafé doit contenir entre 2 et 100 caractères."),

    siret: z
        .string()
        .trim()
        .regex(regex.siret, "Le SIRET doit contenir exactement 14 chiffres."),

    password: z
        .string()
        .regex(
            regex.password,
            "Le mot de passe doit contenir au moins 8 caractères, une minuscule, une majuscule, un chiffre et un caractère spécial."
        ),

    confirmPassword: z
        .string(),

    managerName: optionalText(
        z
            .string()
            .trim()
            .regex(regex.managerName, "Le nom du manager doit contenir entre 2 et 80 lettres.")
    )
}).strict().refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"]
});

export default managerSchema;
