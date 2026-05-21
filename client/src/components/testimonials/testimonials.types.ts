export type TestimonialImage = {
  src: string;
  alt: string;
};

export type Testimonial = {
  id: string;
  name: string;
  age: number;
  stat: {
    amount: string;
    timeframe: string;
  };
  quote: string;
  beforeImage: TestimonialImage;
  afterImage: TestimonialImage;
};
