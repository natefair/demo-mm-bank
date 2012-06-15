#!/usr/local/bin/perl -w
# ------------------------------------------------------------------------------
# $Id$
# ------------------------------------------------------------------------------
# FILE: generate_client_files.pl
# AUTH: Nathan E. Fairchild
# DATE: May-29-2012
# ------------------------------------------------------------------------------

use strict;
use warnings;
use Carp;
use Cwd;
use File::Basename;
use File::Find;
use FindBin qw($Bin);

my $BASE_DIR = "$Bin/..";

# ------------------------------------------------------------------------------
sub usage {
    my $msg  = shift;
    my $self = basename($0);

    if ($msg) {
        print "\nERROR: $msg\n\n";
    }
    print <<"ENDUSAGE";
USAGE:

    $self -make <client_name> [config option pairs]

    $self -clean <client_name>


EXAMPLES:

    $self -make amex \\
        CLIENT_CAMEL_CASE=Amex \\
        BACKGROUND_COLOR= \\
        BACKGROUND_REPEAT= \\
        FONT_COLOR='#26759b' \\
        HEADING_FONT_COLOR='#26759b' \\
        HEADING_FONT_WEIGHT=normal \\
        LAST_CARD_DIGIT_PREFIX='-' \\
        LAST_NUM_CARD_DIGITS=5

    $self -make 'capone' \\
        CLIENT_CAMEL_CASE=CapOne \\
        BACKGROUND_COLOR='#013b70' \\
        BACKGROUND_REPEAT=no-repeat \\
        FONT_COLOR='#06467c' \\
        HEADING_FONT_COLOR='#ffffff' \\
        HEADING_FONT_WEIGHT=bold \\
        LAST_CARD_DIGIT_PREFIX='...' \\
        LAST_NUM_CARD_DIGITS=4

ENDUSAGE

    exit ($msg ? 1 : 0);
}

# ------------------------------------------------------------------------------
sub clean {
    my ($client) = @_;
    return find( sub {
        if (m/-$client\.(css|html|js)/) {
            print "CLEAN: $_\n";
            unlink $_;
        }
    }, 'build' );
}

# ------------------------------------------------------------------------------
sub generate_file {
    my ($client, $config, $template) = @_;

    # Read in and translate the template
    my @lines = ();
    open my $template_fh, '<', $template or croak "Cannot read template $template: $!";
    while (my $line = <$template_fh>) {
        foreach my $key (keys %{$config}) {
            $line =~ s/\$$key/$config->{$key}/g;
        }
        push @lines, $line;
    }
    close $template_fh or croak "Cannot close $template: $!";

    my $lines = join q{}, @lines;

    # Write the new file
    my $new_file = "$File::Find::dir/$template";
       $new_file =~ s/-template\./-$client./;
       $new_file =~ s/templates/build/;

    my $dir = getcwd;
    chdir $BASE_DIR;

    open my $new_file_fh, '>', $new_file or croak "Cannot create $new_file: $!";
    print $new_file_fh $lines;
    close $new_file_fh or croak "Cannot close $new_file: $!";

    chdir $dir;

    return 0;
}

# ------------------------------------------------------------------------------
sub make {
    my ($client, $config) = @_;

    return find( sub {
        if (m/-template\.(css|html|js)/) {
            generate_file($client, $config, $_);
        }
    }, 'templates' );
}

# ------------------------------------------------------------------------------
# MAIN
# ------------------------------------------------------------------------------
my $action = shift or usage('please specify an action: -make or -clean');
my $client = shift or usage('please specify a client name: e.g. amex');

#chdir "$Bin/.." or croak "Cannot change directory to $Bin/..";

if ($action eq '-make') {
    my $config = {
        'CLIENT_NAME' => $client
    };
    foreach my $arg (@ARGV) {
        if ($arg =~ m/^([A-Z][A-Z_]+)=(.*)$/o) {
            $config->{$1} = $2;
        }
    }
    make($client, $config);
} elsif ($action eq '-clean') {
    if ($client) {
        if ($client ne 'template') {
            clean($client);
        } else {
            usage('"template" is not a valid argument for the -clean action');
        }
    } else {
        usage('the -clean action requires a client name argument');
    }
} else {
    usage("The action '$action' is unknown")
}
