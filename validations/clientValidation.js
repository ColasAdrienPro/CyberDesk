import { z } from "zod";

const regex = {
    name: /^[\p{L}\s'-]{2,80}$/u,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.#_-])[A-Za-z\d@$!%*?&.#_-]{8,}$/,
    gender: /^[\p{L}\s'-]{2,50}$/u
};

const optionalText = (schema) => z.preprocess(
    (value) => value === "" ? undefined : value,
    schema.optional()
);

const optionalNumber = (schema) => z.preprocess(
    (value) => value === "" ? undefined : Number(value),
    schema.optional()
);

const clientSchema = z.object({
    firstname: z
        .string()
        .trim()
        .regex(regex.name, "Le prenom doit contenir entre 2 et 80 lettres."),

    lastname: z
        .string()
        .trim()
        .regex(regex.name, "Le nom doit contenir entre 2 et 80 lettres."),

    email: z
        .string()
        .trim()
        .email("L'adresse email est invalide."),

    password: z
        .string()
        .regex(
            regex.password,
            "Le mot de passe doit contenir au moins 8 caracteres, une minuscule, une majuscule, un chiffre et un caractere special."
        ),

    comfirmedPassword: z
        .string(),

    age: optionalNumber(
        z
            .number({ error: "L'age doit etre un nombre." })
            .int("L'age doit etre un nombre entier.")
            .min(13, "L'age minimum est de 13 ans.")
            .max(120, "L'age maximum est de 120 ans.")
    ),

    gender: optionalText(
        z
            .string()
            .trim()
            .regex(regex.gender, "Le genre doit contenir entre 2 et 50 lettres.")
    )
}).strict().refine((data) => data.password === data.comfirmedPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["comfirmedPassword"]
});

export default clientSchema;
