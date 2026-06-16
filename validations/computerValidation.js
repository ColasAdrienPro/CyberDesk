import { z } from "zod";

const regex = {
    name: /^[\p{L}0-9\s'._-]{2,80}$/u,
    macAddress: /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/
};

const computerSchema = z.object({
    name: z
        .string()
        .trim()
        .regex(regex.name, "Le nom du poste doit contenir entre 2 et 80 caractères."),

    macAddress: z
        .string()
        .trim()
        .regex(regex.macAddress, "L'adresse MAC doit être au format XX:XX:XX:XX:XX:XX.")
        .transform((value) => value.replaceAll("-", ":").toUpperCase())
}).strict();

export default computerSchema;
