import { z } from "zod";

// Formats acceptes pour les champs client. Ils restent centralises pour que
// creation et modification appliquent les memes contraintes.
const regex = {
    name: /^[\p{L}\s'-]{2,80}$/u,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.#_-])[A-Za-z\d@$!%*?&.#_-]{8,}$/,
    gender: /^[\p{L}\s'-]{2,50}$/u
};

// Les formulaires HTML envoient "" pour un champ vide: ces helpers les
// transforment en undefined afin que Zod gere correctement l'optionnel.
const optionalText = (schema) => z.preprocess(
    (value) => value === "" ? undefined : value,
    schema.optional()
);

const optionalNumber = (schema) => z.preprocess(
    (value) => value === "" ? undefined : Number(value),
    schema.optional()
);

// Mot de passe optionnel utilise uniquement lors d'une modification client:
// vide = on conserve l'ancien mot de passe, rempli = on valide puis hash.
const optionalPassword = z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().regex(
        regex.password,
        "Le mot de passe doit contenir au moins 8 caracteres, une minuscule, une majuscule, un chiffre et un caractere special."
    ).optional()
);

// Champs communs entre creation et edition d'un client.
const clientBaseSchema = z.object({
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
});

// Schema de creation: le mot de passe est obligatoire et doit etre confirme.
const clientSchema = clientBaseSchema.extend({

    password: z
        .string()
        .regex(
            regex.password,
            "Le mot de passe doit contenir au moins 8 caracteres, une minuscule, une majuscule, un chiffre et un caractere special."
        ),

    comfirmedPassword: z
        .string()
}).strict().refine((data) => data.password === data.comfirmedPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["comfirmedPassword"]
});

// Schema d'edition: les infos personnelles sont controlees comme a la
// creation, mais le mot de passe devient facultatif.
export const clientUpdateSchema = clientBaseSchema.extend({
    password: optionalPassword,
    comfirmedPassword: z.preprocess(
        (value) => value === "" ? undefined : value,
        z.string().optional()
    )
}).strict().refine((data) => data.password === data.comfirmedPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["comfirmedPassword"]
});

export default clientSchema;
