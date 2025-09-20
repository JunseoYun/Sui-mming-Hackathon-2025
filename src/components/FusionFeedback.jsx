import React, { useMemo } from "react";
import { translateSpecies } from "../i18n";

const SPARK_COUNT = 14;

export default function FusionFeedback({ feedback, onClose, t, language }) {
  const content = useMemo(() => {
    if (!feedback) return null;

    if (feedback.type === "success") {
      const speciesLabel = translateSpecies(feedback.blockmon.species, language);
      const rawName = feedback.blockmon.name;
      let nameLabel = rawName || speciesLabel || feedback.blockmon.species;

      if (language === "en") {
        const source = rawName ?? "";
        const [base, suffix] = source.split("-", 2);
        const translatedBase =
          translateSpecies(base, language) ||
          speciesLabel ||
          translateSpecies(feedback.blockmon.species, language) ||
          base;

        nameLabel = suffix ? `${translatedBase}-${suffix}` : translatedBase;
      }

      return {
        title: t("fusion.feedback.successTitle"),
        body: t("fusion.feedback.successBody", {
          name: nameLabel,
          species: speciesLabel || feedback.blockmon.species,
        }),
      };
    }

    return {
      title: t("fusion.feedback.failureTitle"),
      body: t("fusion.feedback.failureBody", { chance: feedback.chance }),
    };
  }, [feedback, language, t]);

  if (!feedback) {
    return null;
  }

  return (
    <div
      className={`fusion-feedback fusion-feedback--${feedback.type}`}
      role="alertdialog"
      aria-live="assertive"
    >
      <div className="fusion-feedback__backdrop" aria-hidden />
      <div className="fusion-feedback__panel">
        {feedback.type === "success" && (
          <div className="fusion-feedback__burst" aria-hidden>
            {Array.from({ length: SPARK_COUNT }).map((_, index) => (
              <span
                key={index}
                style={{
                  "--index": index,
                  "--angle": `${(360 / SPARK_COUNT) * index}deg`,
                  "--delay": `${index * 20}ms`,
                }}
              />
            ))}
          </div>
        )}

        <h3>{content?.title}</h3>
        <p>{content?.body}</p>

        <button type="button" className="fusion-feedback__close" onClick={onClose}>
          {t("fusion.feedback.close")}
        </button>
      </div>
    </div>
  );
}
