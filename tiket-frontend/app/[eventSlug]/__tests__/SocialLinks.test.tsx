import { describe, it, expect, mock } from "bun:test";
import { render, screen } from "@testing-library/react";
import React from "react";
import {
  normalizeSocialUrl,
  validateSocialUrl,
  normalizeSocialLinks,
  validateEventPayload,
} from "@/lib/validators/event";
import type { Event, EventSocialLinks } from "@/types/event";

// Mock next/headers
mock.module("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
  }),
}));

// Mock next/navigation
mock.module("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

// Mock child components that might need Google Maps or complex contexts
mock.module("../components/RegistrationCard", () => ({
  default: () => <div data-testid="mock-registration-card" />,
}));

mock.module("../components/EventLocation", () => ({
  default: () => <div data-testid="mock-event-location" />,
}));

let mockEventData: Event | null = null;
let mockHostsData: unknown[] = [];

mock.module("../api/eventApi", () => ({
  getEventBySlug: async () => mockEventData,
  getMe: async () => null,
  getEventHosts: async () => mockHostsData,
  getEventAvailability: async () => ({ available: true, tiers: [] }),
}));

// Import the async server component page
import EventPage from "../page";

describe("Social Media & Community Links", () => {
  describe("lib/validators/event - URL & Handle Normalization / Validation", () => {
    it("auto-prefixes https:// to bare domains", () => {
      expect(normalizeSocialUrl("website", "mywebsite.com")).toBe(
        "https://mywebsite.com/",
      );
      expect(normalizeSocialUrl("website", "https://existing.com/page")).toBe(
        "https://existing.com/page",
      );
    });

    it("converts Instagram handles to full profile URLs", () => {
      expect(normalizeSocialUrl("instagram", "@alice")).toBe(
        "https://instagram.com/alice",
      );
      expect(normalizeSocialUrl("instagram", "alice")).toBe(
        "https://instagram.com/alice",
      );
      expect(normalizeSocialUrl("instagram", "instagram.com/alice")).toBe(
        "https://instagram.com/alice",
      );
    });

    it("converts X / Twitter handles to full profile URLs", () => {
      expect(normalizeSocialUrl("twitter", "@bob")).toBe("https://x.com/bob");
      expect(normalizeSocialUrl("twitter", "bob")).toBe("https://x.com/bob");
      expect(normalizeSocialUrl("twitter", "twitter.com/bob")).toBe(
        "https://twitter.com/bob",
      );
    });

    it("converts YouTube channel handles to full URLs", () => {
      expect(normalizeSocialUrl("youtube", "@coolchannel")).toBe(
        "https://youtube.com/@coolchannel",
      );
      expect(normalizeSocialUrl("youtube", "coolchannel")).toBe(
        "https://youtube.com/@coolchannel",
      );
      expect(normalizeSocialUrl("youtube", "youtube.com/c/coolchannel")).toBe(
        "https://youtube.com/c/coolchannel",
      );
    });

    it("normalizes LinkedIn profile URLs and handles", () => {
      expect(normalizeSocialUrl("linkedin", "in/charlie")).toBe(
        "https://in/charlie",
      );
      expect(normalizeSocialUrl("linkedin", "charlie")).toBe(
        "https://linkedin.com/in/charlie",
      );
      expect(
        normalizeSocialUrl("linkedin", "linkedin.com/in/charlie"),
      ).toBe("https://linkedin.com/in/charlie");
    });

    it("normalizes Community links (Discord, WhatsApp, Telegram)", () => {
      expect(normalizeSocialUrl("community", "discord.gg/awesome")).toBe(
        "https://discord.gg/awesome",
      );
      expect(
        normalizeSocialUrl("community", "chat.whatsapp.com/invite123"),
      ).toBe("https://chat.whatsapp.com/invite123");
      expect(normalizeSocialUrl("community", "t.me/mychannel")).toBe(
        "https://t.me/mychannel",
      );
    });

    it("strictly rejects dangerous and invalid schemes", () => {
      expect(normalizeSocialUrl("website", "javascript:alert(1)")).toBeNull();
      expect(
        normalizeSocialUrl("website", "  javascript:void(0)  "),
      ).toBeNull();
      expect(normalizeSocialUrl("instagram", "data:text/html,hack")).toBeNull();
      expect(normalizeSocialUrl("twitter", "vbscript:msgbox(1)")).toBeNull();
      expect(normalizeSocialUrl("community", "file:///etc/passwd")).toBeNull();
    });

    it("validateSocialUrl reports errors for dangerous schemes and invalid URLs", () => {
      expect(validateSocialUrl("website", "javascript:alert(1)")).toBe(
        "Invalid website URL or handle.",
      );
      expect(validateSocialUrl("instagram", "@goodhandle")).toBeNull();
      expect(validateSocialUrl("website", "")).toBeNull();
      expect(validateSocialUrl("website", null)).toBeNull();
    });

    it("normalizeSocialLinks converts all present fields and drops empty ones", () => {
      const normalized = normalizeSocialLinks({
        website: "example.org",
        instagram: "@instacreator",
        twitter: "xcreator",
        linkedin: "linkedin.com/in/prof",
        youtube: "@ytcreator",
        community: "discord.gg/xyz",
      });

      expect(normalized.website).toBe("https://example.org/");
      expect(normalized.instagram).toBe("https://instagram.com/instacreator");
      expect(normalized.twitter).toBe("https://x.com/xcreator");
      expect(normalized.linkedin).toBe("https://linkedin.com/in/prof");
      expect(normalized.youtube).toBe("https://youtube.com/@ytcreator");
      expect(normalized.community).toBe("https://discord.gg/xyz");
    });

    it("validateEventPayload rejects invalid social links", () => {
      const basePayload = {
        title: "Test Event",
        startDate: "2026-12-01T10:00:00.000Z",
        endDate: "2026-12-01T12:00:00.000Z",
        regStartDate: "2026-11-01T10:00:00.000Z",
        regEndDate: "2026-12-01T09:00:00.000Z",
      };

      const invalidPayload = {
        ...basePayload,
        socialLinks: {
          website: "javascript:alert(1)",
        },
      };

      expect(validateEventPayload(invalidPayload)).toBe(
        "Invalid website URL or handle.",
      );

      const validPayload = {
        ...basePayload,
        socialLinks: {
          website: "https://example.com",
          instagram: "@creator",
        },
      };

      expect(validateEventPayload(validPayload)).toBeNull();
    });
  });

  describe("EventPage Component - Public Social Links Display", () => {
    const createBaseEvent = (
      socialLinks?: EventSocialLinks | null,
    ): Event => ({
      id: "event-123",
      title: "Design & Tech Summit",
      description: "A great conference for builders.",
      coverImage: null,
      color: "#000000",
      locationType: "online",
      locationDetails: { link: "https://meet.google.com/abc" },
      socialLinks: socialLinks || null,
      startDate: "2026-12-01T10:00:00.000Z",
      endDate: "2026-12-01T18:00:00.000Z",
      timezone: "UTC",
      registrationStart: "2026-11-01T10:00:00.000Z",
      registrationEnd: "2026-11-30T10:00:00.000Z",
      fontFamily: "'Inter', sans-serif",
      requireApproval: false,
      capacity: 200,
      status: "published",
      slug: "tech-summit-2026",
      organizationId: "org-1",
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z",
    });

    it("renders all configured social links with rel='noopener noreferrer' and target='_blank'", async () => {
      mockEventData = createBaseEvent({
        website: "https://mysummit.io",
        instagram: "https://instagram.com/mysummit",
        twitter: "https://x.com/mysummit",
        linkedin: "https://linkedin.com/company/mysummit",
        youtube: "https://youtube.com/@mysummit",
        community: "https://discord.gg/mysummit",
      });
      mockHostsData = [{ id: "host-1", name: "Host Team", role: "Organizer", isCreator: true }];

      const pageJsx = await EventPage({
        params: Promise.resolve({ eventSlug: "tech-summit-2026" }),
      });

      render(pageJsx);

      const socialContainer = screen.getByTestId("event-social-links");
      expect(socialContainer).toBeDefined();

      const websiteLink = screen.getByTestId("social-link-website");
      expect(websiteLink.getAttribute("href")).toBe("https://mysummit.io");
      expect(websiteLink.getAttribute("target")).toBe("_blank");
      expect(websiteLink.getAttribute("rel")).toBe("noopener noreferrer");
      expect(websiteLink.getAttribute("aria-label")).toBe("Website");

      const instagramLink = screen.getByTestId("social-link-instagram");
      expect(instagramLink.getAttribute("href")).toBe("https://instagram.com/mysummit");
      expect(instagramLink.getAttribute("target")).toBe("_blank");
      expect(instagramLink.getAttribute("rel")).toBe("noopener noreferrer");

      const twitterLink = screen.getByTestId("social-link-twitter");
      expect(twitterLink.getAttribute("href")).toBe("https://x.com/mysummit");
      expect(twitterLink.getAttribute("target")).toBe("_blank");
      expect(twitterLink.getAttribute("rel")).toBe("noopener noreferrer");

      const linkedinLink = screen.getByTestId("social-link-linkedin");
      expect(linkedinLink.getAttribute("href")).toBe("https://linkedin.com/company/mysummit");
      expect(linkedinLink.getAttribute("target")).toBe("_blank");
      expect(linkedinLink.getAttribute("rel")).toBe("noopener noreferrer");

      const youtubeLink = screen.getByTestId("social-link-youtube");
      expect(youtubeLink.getAttribute("href")).toBe("https://youtube.com/@mysummit");
      expect(youtubeLink.getAttribute("target")).toBe("_blank");
      expect(youtubeLink.getAttribute("rel")).toBe("noopener noreferrer");

      const communityLink = screen.getByTestId("social-link-community");
      expect(communityLink.getAttribute("href")).toBe("https://discord.gg/mysummit");
      expect(communityLink.getAttribute("target")).toBe("_blank");
      expect(communityLink.getAttribute("rel")).toBe("noopener noreferrer");
    });

    it("hides social links section when no links are configured", async () => {
      mockEventData = createBaseEvent(null);

      const pageJsx = await EventPage({
        params: Promise.resolve({ eventSlug: "tech-summit-2026" }),
      });

      render(pageJsx);

      expect(screen.queryByTestId("event-social-links")).toBeNull();
    });

    it("only renders provided links and hides empty/null fields", async () => {
      mockEventData = createBaseEvent({
        website: "https://mysummit.io",
        instagram: "https://instagram.com/mysummit",
        twitter: null,
        linkedin: "",
        youtube: undefined,
        community: "   ",
      });

      const pageJsx = await EventPage({
        params: Promise.resolve({ eventSlug: "tech-summit-2026" }),
      });

      render(pageJsx);

      expect(screen.getByTestId("event-social-links")).toBeDefined();
      expect(screen.getByTestId("social-link-website")).toBeDefined();
      expect(screen.getByTestId("social-link-instagram")).toBeDefined();
      expect(screen.queryByTestId("social-link-twitter")).toBeNull();
      expect(screen.queryByTestId("social-link-linkedin")).toBeNull();
      expect(screen.queryByTestId("social-link-youtube")).toBeNull();
      expect(screen.queryByTestId("social-link-community")).toBeNull();
    });
  });
});
