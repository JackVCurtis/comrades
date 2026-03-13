import React from 'react';
import renderer from 'react-test-renderer';

const redirectMock = jest.fn(() => null);

jest.mock('expo-router', () => ({
  Redirect: (props: { href: string }) => redirectMock(props),
}));

describe('root route', () => {
  it('redirects / to the handshake tab route', () => {
    const RootIndex = require('@/app/index').default;

    renderer.create(<RootIndex />);

    expect(redirectMock).toHaveBeenCalledWith({ href: '/handshake' });
  });
});
